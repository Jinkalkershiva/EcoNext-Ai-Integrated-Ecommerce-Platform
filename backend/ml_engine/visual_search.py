"""Visual search engine: CLIP + FAISS when available, colour-histogram fallback otherwise.

Design notes
------------
Two things about this module matter for reliability:

1. **The engine is built lazily.** It used to be instantiated at import time
   (`visual_search_engine = VisualSearchEngine()`), and its constructor queries
   the Product table and downloads every product image. Because
   products/api_views.py imports this module, that ran during `manage.py
   migrate` and `runserver` startup — on a fresh clone the table does not exist
   yet, so the whole project failed to boot with "no such table:
   products_product". `visual_search_engine` is now a proxy that constructs the
   real engine on first search.

2. **The fallback needs only Pillow and NumPy.** The histogram path previously
   required OpenCV, which is a large dependency that fails to import on headless
   servers without libGL. The histogram is now computed with `np.histogramdd`
   and compared with the same chi-square formula OpenCV uses, so previously
   generated `feature_vectors.npy` files remain valid: both produce 8x8x8 = 512
   L2-normalised bins in the same order.

Plugging in a real model
------------------------
Install `torch`, `transformers` and (optionally) `faiss-cpu`, then call
`get_visual_search_engine().refresh_feature_vectors()` once to build
`clip_embeddings.npy` / `clip_faiss.index`. Nothing else needs to change:
`search()` prefers CLIP whenever it is importable and silently falls back.
"""

import logging
import os
import threading
from io import BytesIO

import numpy as np
import requests
from PIL import Image

from django.conf import settings

from products.models import Product

logger = logging.getLogger(__name__)

try:
    import faiss
except Exception:  # pragma: no cover - optional dependency
    faiss = None

try:
    import torch
    from transformers import CLIPModel, CLIPProcessor
except Exception:  # pragma: no cover - optional dependency
    torch = None
    CLIPModel = None
    CLIPProcessor = None

HIST_BINS = 8
HIST_RANGE = ((0, 256), (0, 256), (0, 256))
IMAGE_DOWNLOAD_TIMEOUT = 8


def _histogram(image):
    """8x8x8 RGB histogram, L2-normalised.

    Byte-for-byte equivalent to the previous
    `cv2.calcHist([img], [0,1,2], None, [8,8,8], [0,256]*3)` + `cv2.normalize`,
    so existing cached vectors stay compatible.
    """
    pixels = np.asarray(image, dtype=np.float32).reshape(-1, 3)
    hist, _ = np.histogramdd(pixels, bins=(HIST_BINS,) * 3, range=HIST_RANGE)
    hist = hist.astype(np.float32).ravel()
    norm = float(np.linalg.norm(hist))
    if norm > 0:
        hist /= norm
    return hist


def _chi_square(query, candidate):
    """OpenCV's HISTCMP_CHISQR: sum over bins of (q - c)^2 / q, skipping q == 0."""
    query = np.asarray(query, dtype=np.float32).ravel()
    candidate = np.asarray(candidate, dtype=np.float32).ravel()
    if query.shape != candidate.shape:
        return float('inf')
    nonzero = query != 0
    if not np.any(nonzero):
        return float('inf')
    diff = query[nonzero] - candidate[nonzero]
    return float(np.sum((diff * diff) / query[nonzero]))


class VisualSearchEngine:
    """Product retrieval by image similarity."""

    def __init__(self):
        self.model_name = os.getenv("VISUAL_MODEL_NAME", "openai/clip-vit-base-patch32")
        self.index_dir = os.path.join(settings.BASE_DIR, "ml_engine")
        self.clip_embeddings_path = os.path.join(self.index_dir, "clip_embeddings.npy")
        self.clip_ids_path = os.path.join(self.index_dir, "clip_product_ids.npy")
        self.faiss_index_path = os.path.join(self.index_dir, "clip_faiss.index")
        self.hist_vectors_path = os.path.join(self.index_dir, "feature_vectors.npy")

        self.clip_enabled = bool(torch and CLIPModel and CLIPProcessor)
        self.faiss_enabled = faiss is not None
        self.device = "cpu"
        self.clip_ready = False

        self.model = None
        self.processor = None
        self.faiss_index = None
        self.clip_embeddings = None
        self.product_ids = np.array([], dtype=np.int64)

        if self.clip_enabled:
            logger.info("Visual search: CLIP available (faiss=%s)", self.faiss_enabled)
        else:
            logger.info(
                "Visual search: CLIP dependencies not installed, using colour-histogram matching"
            )

        self.feature_vectors = self._load_or_create_histogram_vectors()

    # ---------------- backend describing itself ----------------

    @property
    def backend(self):
        if self.clip_enabled and self.clip_ready:
            return "clip+faiss" if self.faiss_enabled and self.faiss_index is not None else "clip"
        return "histogram"

    # ---------------- image loading ----------------

    def _open_image(self, image_path_or_stream):
        """Load a path or file-like object as an RGB PIL image."""
        if isinstance(image_path_or_stream, (str, os.PathLike)):
            with Image.open(image_path_or_stream) as image:
                return image.convert("RGB")
        if hasattr(image_path_or_stream, "seek"):
            image_path_or_stream.seek(0)
        return Image.open(image_path_or_stream).convert("RGB")

    def _download_image(self, image_url):
        """Download a remote image into memory as an RGB PIL image."""
        response = requests.get(image_url, timeout=IMAGE_DOWNLOAD_TIMEOUT)
        response.raise_for_status()
        return Image.open(BytesIO(response.content)).convert("RGB")

    # ---------------- CLIP path ----------------

    def _ensure_clip_ready(self):
        """Initialise the CLIP model and index on first use."""
        if not self.clip_enabled:
            return False
        if self.clip_ready:
            return True
        try:
            self.model = CLIPModel.from_pretrained(self.model_name)
            self.processor = CLIPProcessor.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
            self._load_or_build_clip_index()
            self.clip_ready = True
            return True
        except Exception:
            logger.warning(
                "CLIP initialisation failed; falling back to histogram search", exc_info=True
            )
            self.clip_enabled = False
            return False

    def _encode_clip_image(self, image):
        """Encode a PIL image into an L2-normalised CLIP embedding."""
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {key: value.to(self.device) for key, value in inputs.items()}
        with torch.no_grad():
            feats = self.model.get_image_features(**inputs)

        if hasattr(feats, "cpu"):
            emb_tensor = feats
        elif hasattr(feats, "image_embeds"):
            emb_tensor = feats.image_embeds
        elif hasattr(feats, "pooler_output"):
            emb_tensor = feats.pooler_output
        else:
            raise ValueError("Unexpected CLIP output structure during image encoding")

        embedding = emb_tensor.cpu().numpy().astype(np.float32)
        norm = np.linalg.norm(embedding, axis=1, keepdims=True)
        embedding = embedding / np.clip(norm, 1e-12, None)
        return embedding[0]

    def _build_clip_index(self):
        """Build CLIP embeddings (and a FAISS index) from product image URLs."""
        product_ids = []
        embeddings = []

        for product in _products_with_images():
            try:
                emb = self._encode_clip_image(self._download_image(product.image_url))
                product_ids.append(product.id)
                embeddings.append(emb)
            except Exception as exc:
                logger.debug("Skipping product %s in CLIP index: %s", product.id, exc)

        if not embeddings:
            self.product_ids = np.array([], dtype=np.int64)
            self.clip_embeddings = np.empty((0, 512), dtype=np.float32)
            self.faiss_index = None
            return

        self.product_ids = np.asarray(product_ids, dtype=np.int64)
        self.clip_embeddings = np.asarray(embeddings, dtype=np.float32)

        np.save(self.clip_ids_path, self.product_ids)
        np.save(self.clip_embeddings_path, self.clip_embeddings)
        logger.info("Built CLIP index over %d products", len(product_ids))

        if self.faiss_enabled:
            index = faiss.IndexFlatIP(self.clip_embeddings.shape[1])
            index.add(self.clip_embeddings)
            faiss.write_index(index, self.faiss_index_path)
            self.faiss_index = index
        else:
            self.faiss_index = None

    def _load_or_build_clip_index(self):
        """Load cached CLIP artifacts if present, otherwise build them."""
        artifacts_exist = (
            os.path.exists(self.clip_embeddings_path)
            and os.path.exists(self.clip_ids_path)
            and (not self.faiss_enabled or os.path.exists(self.faiss_index_path))
        )

        if artifacts_exist:
            try:
                self.clip_embeddings = np.load(self.clip_embeddings_path)
                self.product_ids = np.load(self.clip_ids_path)
                if self.faiss_enabled:
                    self.faiss_index = faiss.read_index(self.faiss_index_path)
                return
            except Exception:
                logger.warning("Cached CLIP index unreadable; rebuilding", exc_info=True)

        self._build_clip_index()

    def _clip_search(self, query_image_stream, top_k):
        """CLIP similarity search via FAISS, or a NumPy dot product."""
        if not self._ensure_clip_ready():
            return []

        if self.clip_embeddings is None or self.product_ids.size == 0:
            self._load_or_build_clip_index()
            if self.product_ids.size == 0:
                return []

        query_emb = (
            self._encode_clip_image(self._open_image(query_image_stream))
            .astype(np.float32)
            .reshape(1, -1)
        )

        max_k = int(min(max(top_k, 1), len(self.product_ids)))
        if max_k <= 0:
            return []

        if self.faiss_enabled and self.faiss_index is not None:
            scores, indices = self.faiss_index.search(query_emb, max_k)
            scores, indices = scores[0], indices[0]
        else:
            scores = np.dot(self.clip_embeddings, query_emb[0])
            indices = np.argsort(-scores)[:max_k]
            scores = scores[indices]

        scored_ids = [
            (int(self.product_ids[idx]), float(np.clip((float(score) + 1.0) / 2.0, 0.0, 1.0)))
            for idx, score in zip(indices, scores)
            if 0 <= idx < len(self.product_ids)
        ]
        return _attach_products(scored_ids)

    # ---------------- histogram fallback ----------------

    def _extract_histogram_features(self, image_path_or_stream):
        """Histogram feature vector for a local image or stream."""
        try:
            image = self._open_image(image_path_or_stream).resize((128, 128))
            return _histogram(image)
        except Exception:
            logger.debug("Histogram extraction failed", exc_info=True)
            return None

    def _extract_histogram_from_url(self, image_url):
        """Download an image and extract its histogram features."""
        if not image_url:
            return None
        try:
            # Previously this passed PIL's raw pixel buffer back into
            # Image.open(), which could never succeed. Resize the decoded image
            # directly instead.
            return _histogram(self._download_image(image_url).resize((128, 128)))
        except Exception as exc:
            logger.debug("Histogram extraction failed for %s: %s", image_url, exc)
            return None

    def _load_or_create_histogram_vectors(self):
        """Load cached histogram vectors, or build them from product images."""
        if os.path.exists(self.hist_vectors_path):
            try:
                return np.load(self.hist_vectors_path, allow_pickle=True).item()
            except Exception:
                logger.warning("Cached histogram vectors unreadable; rebuilding", exc_info=True)

        vectors = {}
        for product in _products_with_images():
            vector = self._extract_histogram_from_url(product.image_url)
            if vector is not None:
                vectors[product.id] = vector

        if vectors:
            try:
                np.save(self.hist_vectors_path, vectors)
            except OSError:
                logger.warning("Could not cache histogram vectors to %s", self.hist_vectors_path)
        logger.info("Histogram index covers %d products", len(vectors))
        return vectors

    def _histogram_search(self, query_image_stream, top_k):
        """Colour-histogram nearest-neighbour search."""
        query_features = self._extract_histogram_features(query_image_stream)
        if query_features is None:
            return []

        if not self.feature_vectors:
            self.feature_vectors = self._load_or_create_histogram_vectors()
            if not self.feature_vectors:
                return []

        distances = sorted(
            (
                (product_id, _chi_square(query_features, vector))
                for product_id, vector in self.feature_vectors.items()
            ),
            key=lambda pair: pair[1],
        )

        scored_ids = [
            (product_id, float(max(0.0, 1.0 - (distance / 100.0))))
            for product_id, distance in distances[:top_k]
            if distance != float('inf')
        ]
        return _attach_products(scored_ids)

    # ---------------- public API ----------------

    def refresh_feature_vectors(self):
        """Regenerate every cached artifact. Safe to call from a shell or task."""
        for path in (
            self.clip_embeddings_path,
            self.clip_ids_path,
            self.faiss_index_path,
            self.hist_vectors_path,
        ):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    logger.warning("Could not remove %s", path)

        self.clip_ready = False
        if self.clip_enabled and self._ensure_clip_ready():
            self._build_clip_index()
        self.feature_vectors = self._load_or_create_histogram_vectors()
        return {'backend': self.backend, 'indexed_products': len(self.feature_vectors)}

    def search(self, query_image_stream, top_k=10):
        """Find the top-k visually similar products. Prefers CLIP, else histogram."""
        clip_results = self._clip_search(query_image_stream, top_k)
        if clip_results:
            return clip_results
        return self._histogram_search(query_image_stream, top_k)


def _products_with_images():
    """Products that actually have an image URL to index."""
    return Product.objects.exclude(image_url__isnull=True).exclude(image_url="").only(
        'id', 'image_url'
    )


def _attach_products(scored_ids):
    """Turn [(product_id, score)] into [{'product': Product, 'similarity_score': float}].

    Fetches every product in one query instead of one query per result, and
    preserves ranking order.
    """
    if not scored_ids:
        return []

    products = {
        product.id: product
        for product in Product.objects
        .select_related('category', 'subcategory', 'skin_or_body_fit', 'season', 'occasion')
        .prefetch_related('age_groups', 'gender_categories', 'eco_tags')
        .filter(id__in=[product_id for product_id, _ in scored_ids])
    }

    return [
        {'product': products[product_id], 'similarity_score': score}
        for product_id, score in scored_ids
        if product_id in products
    ]


class _LazyEngine:
    """Deferring proxy so importing this module never touches the database.

    Keeps the historical `visual_search_engine.search(...)` call site working
    while moving all the expensive setup to the first actual search.
    """

    def __init__(self):
        self._engine = None
        self._lock = threading.Lock()

    def _resolve(self):
        if self._engine is None:
            with self._lock:
                if self._engine is None:
                    self._engine = VisualSearchEngine()
        return self._engine

    def __getattr__(self, name):
        return getattr(self._resolve(), name)


def get_visual_search_engine():
    """Return the process-wide engine, building it on first call."""
    return visual_search_engine._resolve()


visual_search_engine = _LazyEngine()
