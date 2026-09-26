"""
EcoAi service layer — two-pass pipeline using the Google Gemini API.

Pass 1 (MODE 1): Extract structured shopping intent from a raw query.
Pass 2 (MODE 2): Given intent + real DB candidates, select & explain products.

The Gemini API is accessed via its OpenAI compatibility layer, so the request/response format is identical.
"""

import json
import logging
import os
import re
from decimal import Decimal
from typing import Any, Dict, List

import requests
from django.db.models import Q

from products.models import Product
from .prompts import ECOAI_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Gemini API helpers
# ---------------------------------------------------------------------------

def _get_api_config() -> Dict[str, str]:
    """Read Gemini connection settings from environment."""
    return {
        "api_key": os.getenv("GEMINI_API_KEY", ""),
        "api_url": os.getenv("GEMINI_API_URL", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"),
        "model": os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
    }


def _call_gemini(user_message: str, temperature: float = 0) -> str:
    """Send a chat-completion request to the Gemini API and return the reply."""
    config = _get_api_config()

    if not config["api_key"]:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    payload = {
        "model": config["model"],
        "messages": [
            {"role": "system", "content": ECOAI_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        "temperature": temperature,
    }

    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        config["api_url"], headers=headers, json=payload, timeout=30
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()


def _extract_json(text: str) -> Dict[str, Any]:
    """Pull the first JSON object out of an LLM response."""
    # Try fenced code blocks first
    code_block = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if code_block:
        return json.loads(code_block.group(1))

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in Gemini response")
    return json.loads(text[start : end + 1])


# ---------------------------------------------------------------------------
# Fallback parser (runs when API key is missing)
# ---------------------------------------------------------------------------

def _fallback_parse_query(query: str) -> Dict[str, Any]:
    """Regex-based intent extraction when Gemini API is unavailable."""
    lowered = query.lower()

    # Budget
    budget = None
    budget_match = re.search(
        r"(?:under|below|<=?)\s*₹?\s*([\d,]+)|₹\s*([\d,]+)",
        query,
        flags=re.IGNORECASE,
    )
    if budget_match:
        raw = budget_match.group(1) or budget_match.group(2)
        budget = int(raw.replace(",", ""))

    # Category
    category = None
    category_map = {
        "pc": "Electronics",
        "laptop": "Electronics",
        "phone": "Electronics",
        "monitor": "Electronics",
        "keyboard": "Electronics",
        "mouse": "Electronics",
        "headphone": "Electronics",
        "skincare": "Beauty & Personal Care",
        "cosmetic": "Beauty & Personal Care",
        "lipstick": "Beauty & Personal Care",
        "grocery": "Grocery",
        "toy": "Toys & Games",
        "game": "Toys & Games",
        "shoe": "Fashion",
        "shirt": "Fashion",
    }
    for keyword, cat in category_map.items():
        if keyword in lowered:
            category = cat
            break

    # Build detection
    is_build = "build" in lowered and any(
        w in lowered for w in ["pc", "setup", "kit", "routine", "set", "workstation"]
    )

    component_types = []
    if is_build and ("pc" in lowered or "computer" in lowered or "workstation" in lowered):
        component_types = ["CPU", "GPU", "RAM", "Motherboard", "Storage", "PSU", "Cabinet"]

    # Use case
    use_case = ""
    for candidate in ["gaming", "coding", "office", "study", "eco-friendly", "sensitive skin"]:
        if candidate in lowered:
            use_case = candidate
            break

    # Keywords (filter out noise words)
    noise = {"a", "an", "the", "for", "and", "or", "me", "my", "is", "in", "to", "of",
             "under", "below", "best", "good", "great", "build", "get", "buy", "want", "need"}
    keywords = [w for w in lowered.split() if len(w) > 2 and w not in noise]

    return {
        "budget_max": budget,
        "category": category or "Unclear",
        "is_build": is_build,
        "component_types": component_types,
        "use_case": use_case,
        "keywords": keywords[:6],
    }


# ---------------------------------------------------------------------------
# Product helpers
# ---------------------------------------------------------------------------

def _product_to_candidate(product: Product) -> Dict[str, Any]:
    """Convert a Product to a lightweight dict for the Gemini candidates list."""
    return {
        "product_id": product.id,
        "name": product.name,
        "category": product.category.name if product.category_id else None,
        "price": float(product.current_price),
        "description": (product.description or "")[:200],
        "tags": product.tags or [],
    }


def _product_to_response(
    product: Product, reason: str = "", component: str = ""
) -> Dict[str, Any]:
    """Convert a Product to the frontend response dict."""
    result = {
        "id": product.id,
        "name": product.name,
        "category": product.category.name if product.category_id else None,
        "price": float(product.current_price),
        "current_price": float(product.current_price),
        "description": product.description,
        "image_url": product.image_url,
        "reason": reason,
    }
    if component:
        result["component"] = component
    return result


# ---------------------------------------------------------------------------
# Pipeline stages
# ---------------------------------------------------------------------------

def extract_intent(query: str) -> Dict[str, Any]:
    """MODE 1 — ask Gemini to extract structured intent from a raw query."""
    try:
        user_message = json.dumps({"query": query})
        response_text = _call_gemini(user_message, temperature=0)
        return _extract_json(response_text)
    except Exception as exc:
        logger.info('EcoAi intent extraction via Gemini failed (%s); using regex fallback', exc)
        return _fallback_parse_query(query)


def fetch_candidates(intent: Dict[str, Any]) -> List[Product]:
    """Query the DB for products that could match the extracted intent.

    Filters are applied progressively and each one is only kept if it still
    leaves something to recommend. Stacking category AND keywords AND budget
    unconditionally used to return zero rows for most real queries, which made
    the copilot look broken even though it was working exactly as written.
    """
    base = Product.objects.select_related("category")
    products = base.all()

    def narrow(queryset, condition):
        narrowed = queryset.filter(condition)
        return narrowed if narrowed.exists() else queryset

    category = (intent.get("category") or "").strip()
    if category and category != "Unclear":
        products = narrow(products, (
            Q(category__name__icontains=category)
            | Q(name__icontains=category)
            | Q(description__icontains=category)
        ))

    keywords = [kw for kw in (intent.get("keywords") or []) if kw]
    if keywords and not intent.get("is_build"):
        kw_q = Q()
        for kw in keywords:
            kw_q |= Q(name__icontains=kw) | Q(description__icontains=kw)
        products = narrow(products, kw_q)

    budget = intent.get("budget_max")

    # For builds, also pull in component-type matches.
    if intent.get("is_build") and intent.get("component_types"):
        comp_q = Q()
        for comp in intent["component_types"]:
            comp_q |= Q(name__icontains=comp) | Q(description__icontains=comp)
        comp_products = base.filter(comp_q)
        if budget is not None:
            comp_products = comp_products.filter(current_price__lte=Decimal(budget))
        if comp_products.exists():
            products = (products | comp_products).distinct()

    if budget is not None:
        products = narrow(products, Q(current_price__lte=Decimal(budget)))

    candidates = list(products.order_by("-popularity_score")[:50])

    # Absolute last resort: show the catalogue's best rather than nothing.
    if not candidates:
        candidates = list(base.order_by("-popularity_score", "-created_at")[:20])

    return candidates


def get_recommendations(
    query: str, intent: Dict[str, Any], candidates: List[Product]
) -> Dict[str, Any]:
    """MODE 2 — ask Gemini to pick the best products from the candidates list."""
    candidate_dicts = [_product_to_candidate(p) for p in candidates]

    user_message = json.dumps(
        {"query": query, "intent": intent, "candidates": candidate_dicts},
        ensure_ascii=False,
    )

    try:
        response_text = _call_gemini(user_message, temperature=0.3)
        return _extract_json(response_text)
    except Exception as exc:
        logger.info('EcoAi recommendation via Gemini failed (%s); using scoring fallback', exc)
        return _fallback_recommend(candidates, intent)


def _fallback_recommend(
    candidates: List[Product], intent: Dict[str, Any]
) -> Dict[str, Any]:
    """Simple fallback when Gemini is unreachable in MODE 2."""
    purpose = intent.get("use_case", "")

    def _score(p: Product) -> float:
        hay = f"{p.name} {p.description}".lower()
        s = 0.0
        if purpose and purpose.lower() in hay:
            s += 2.0
        for kw in intent.get("keywords", []):
            if kw.lower() in hay:
                s += 1.0
        s += float(getattr(p, "popularity_score", 0) or 0) * 0.5
        return s

    ranked = sorted(candidates, key=_score, reverse=True)[:8]
    budget = intent.get("budget_max")
    budget_note = f" within ₹{budget:,}" if budget else ""

    return {
        "selected_items": [
            {"product_id": p.id, "reason": "Matches your search criteria and budget."}
            for p in ranked
        ],
        "summary": (
            f"Found {len(ranked)} product(s){budget_note} matching your request. "
            "Ranked by relevance to your use case."
        ),
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run_ecoai_pipeline(raw_query: str) -> Dict[str, Any]:
    """
    Full two-pass EcoAi pipeline:
      1. Intent Extraction  (MODE 1 — Gemini or fallback)
      2. DB candidate fetch
      3. Recommendation      (MODE 2 — Gemini or fallback)
      4. Assemble response for the frontend
    """
    # --- Pass 1: intent ---
    intent = extract_intent(raw_query)

    # --- DB lookup ---
    candidates = fetch_candidates(intent)
    candidate_map = {p.id: p for p in candidates}

    # --- Pass 2: recommendation ---
    recommendation = get_recommendations(raw_query, intent, candidates)

    # --- Assemble response ---
    is_build = intent.get("is_build", False)
    selected = recommendation.get("selected_items", [])

    products = []
    for item in selected:
        pid = item.get("product_id")
        product = candidate_map.get(pid)
        if product:
            products.append(
                _product_to_response(
                    product,
                    reason=item.get("reason", ""),
                    component=item.get("component_type", "") if is_build else "",
                )
            )

    ai_response = recommendation.get("summary", "")

    # The model can hallucinate product ids that aren't in the candidate list,
    # which left the response with a summary but no products. Fall back to the
    # top candidates so the user always sees something to click.
    if not products and candidates:
        products = [
            _product_to_response(p, reason="Closest match in our catalogue.")
            for p in candidates[:8]
        ]
        if not ai_response:
            ai_response = (
                f"Here are the {len(products)} closest matches in our catalogue "
                "for what you described."
            )

    if not products and not ai_response:
        ai_response = (
            "I couldn't find anything matching that yet. Try describing the "
            "product type or giving a budget, for example \"running shoes under 3000\"."
        )

    return {
        "structured_query": intent,
        "products": products,
        "ai_response": ai_response,
        "recommendation_type": "bundle" if is_build else "single",
    }
