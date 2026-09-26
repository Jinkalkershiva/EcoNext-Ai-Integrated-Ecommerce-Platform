"""Intent-based product search using TF-IDF.

Maps a natural-language query ("something for the gym") onto products by
comparing it against a TF-IDF representation of each product's name, category,
tags and description.

Two things were fixed here:

* `build_intent_catalog()` returned a bare `[]` when the catalogue was empty,
  while `search_by_intent()` unpacked its result into three variables — so
  searching an empty catalogue raised "not enough values to unpack" rather than
  returning no results. The contract is now always a 3-tuple.
* The index was rebuilt from scratch on *every single search request*, which
  meant a full table scan plus a TF-IDF fit per keystroke. It is now cached in
  process memory and rebuilt only when the catalogue actually changes.
"""

import logging

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from django.db.models import Max

from products.models import Product

logger = logging.getLogger(__name__)

# Process-level cache: {'signature': (count, latest_update), 'products': [...],
# 'matrix': sparse matrix, 'vectorizer': fitted TfidfVectorizer}
_INDEX_CACHE = {}


def _catalogue_signature():
    """Cheap fingerprint of the catalogue, used to decide on a rebuild."""
    stats = Product.objects.aggregate(latest=Max('updated_at'))
    return Product.objects.count(), stats['latest']


def _document_for(product):
    """The text blob a product is indexed by."""
    tags = product.tags if isinstance(product.tags, (list, tuple)) else []
    tag_text = ' '.join(str(tag) for tag in tags)
    return f"{product.name} {product.category.name} {tag_text} {product.description or ''}"


def invalidate_intent_index():
    """Drop the cached index. Call after a bulk product import."""
    _INDEX_CACHE.clear()


class IntentBasedSearcher:
    """TF-IDF retrieval over the product catalogue."""

    MIN_SIMILARITY = 0.1

    def __init__(self):
        self.vectorizer = None

    # ---------------- index ----------------

    def build_intent_catalog(self, force=False):
        """Return (products, tfidf_matrix, vectorizer), building or reusing the index.

        Always returns a 3-tuple. On an empty catalogue that is ([], None, None).
        """
        signature = _catalogue_signature()

        if not force and _INDEX_CACHE.get('signature') == signature:
            self.vectorizer = _INDEX_CACHE['vectorizer']
            return _INDEX_CACHE['products'], _INDEX_CACHE['matrix'], self.vectorizer

        products = list(Product.objects.select_related('category').all())
        documents = [_document_for(product) for product in products]

        if not documents:
            self.vectorizer = None
            return [], None, None

        vectorizer = TfidfVectorizer(
            max_features=1000,
            lowercase=True,
            stop_words='english',
            ngram_range=(1, 2),
        )

        try:
            matrix = vectorizer.fit_transform(documents)
        except ValueError:
            # Every document was stop words only — nothing to index.
            logger.info('TF-IDF index empty after tokenisation; skipping intent search')
            self.vectorizer = None
            return [], None, None

        _INDEX_CACHE.update({
            'signature': signature,
            'products': products,
            'matrix': matrix,
            'vectorizer': vectorizer,
        })
        self.vectorizer = vectorizer
        logger.info('Built TF-IDF intent index over %d products', len(products))
        return products, matrix, vectorizer

    # ---------------- search ----------------

    def search_by_intent(self, query: str, top_k: int = 5):
        """Return the top-k products matching a query, best first."""
        products, matrix, vectorizer = self.build_intent_catalog()
        if not products or matrix is None:
            return []

        query_vector = vectorizer.transform([query])
        similarities = cosine_similarity(query_vector, matrix)[0]

        top_k = max(1, min(top_k, len(products)))
        top_indices = np.argsort(similarities)[::-1][:top_k]

        return [
            {
                'product': products[idx],
                'similarity_score': float(similarities[idx]),
                'intent_match': self._get_intent_explanation(query, products[idx]),
            }
            for idx in top_indices
            if similarities[idx] > self.MIN_SIMILARITY
        ]

    def _get_intent_explanation(self, query: str, product: Product) -> str:
        """A short human-readable reason this product matched."""
        query_lower = query.lower()
        tags = product.tags if isinstance(product.tags, (list, tuple)) else []

        if query_lower in product.name.lower():
            return 'Direct match in product name'
        if any(str(tag).lower() in query_lower for tag in tags):
            return f'Matches intent: {query}'
        if query_lower in product.category.name.lower():
            return f'Found in {product.category.name} category'
        return f'Related to: {query}'

    def extract_intent_tags(self, query: str) -> list:
        """Expand a lifestyle intent into concrete product keywords."""
        common_intents = {
            'gym': ['gym shoes', 'water bottle', 'yoga mat', 'dumbbells', 'athlete'],
            'office': ['desk', 'chair', 'stationery', 'monitor', 'laptop'],
            'cooking': ['knife', 'pan', 'spoon', 'cutting board', 'apron'],
            'travel': ['luggage', 'backpack', 'pillow', 'passport holder'],
            'beach': ['swimsuit', 'sunscreen', 'flip flops', 'beach bag', 'sunglasses'],
        }

        query_lower = query.lower()
        matched = []
        for intent, tags in common_intents.items():
            if intent in query_lower:
                matched.extend(tags)

        return matched or [query]

    def get_category_recommendations(self, query: str) -> dict:
        """Group search results by category, best match first within each."""
        categories = {}
        for result in self.search_by_intent(query, top_k=20):
            categories.setdefault(result['product'].category.name, []).append(result)

        for results in categories.values():
            results.sort(key=lambda item: item['similarity_score'], reverse=True)

        return categories
