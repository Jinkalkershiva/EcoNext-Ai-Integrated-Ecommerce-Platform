"""Sustainability scoring rubric.

Every product in the catalogue carries a `sustainability_score` (0-100) and a
set of `eco_tags`. Both are *derived*, not hand-entered, so they are consistent
across the catalogue and can be recomputed at any time with
`python manage.py backfill_catalogue`.

Why a rubric rather than a model
--------------------------------
There is no labelled training data for "how sustainable is this product", and
inventing one would make the number unexplainable. A transparent keyword rubric
over the text the catalogue already has (`name`, `description`, `tags`) is
honest about what it knows: it reads the claims attached to a product and
grades them. Anything it cannot find evidence for stays at the category
baseline rather than being guessed.

How a score is built
--------------------
    score = category baseline
          + points for each distinct evidence signal found
          - points for each distinct penalty signal found
    clamped to 0-100

Signals are grouped by the kind of claim they represent, and each group is
capped so that a product listing "bamboo, bamboo, bamboo" cannot out-score a
genuinely better product. Verified-material and energy claims are worth more
than unverifiable marketing words like "eco-friendly", which is why
GENERIC_CLAIMS is worth so little.

The letter grade shown in the UI is a band over the same number, using the
stepped A-E form people already recognise from appliance energy labels.
"""

from __future__ import annotations

# --------------------------------------------------------------------------- #
# Signals
# --------------------------------------------------------------------------- #
# Each entry maps a canonical eco tag name to the substrings that evidence it.
# Matching is case-insensitive substring matching over the product's combined
# name + description + tags text.

MATERIAL_SIGNALS = {
    'Bamboo': ('bamboo',),
    'Organic Cotton': ('organic cotton', 'organic-cotton'),
    'Organic': ('organic',),
    'Recycled Materials': ('recycled', 'recycle', 'upcycled', 'post-consumer'),
    'Hemp': ('hemp',),
    'Jute': ('jute',),
    'Cork': ('cork',),
    'Stainless Steel': ('stainless steel', 'stainless-steel'),
    'Glass': ('borosilicate', 'glass jar', 'glass bottle'),
    'FSC Wood': ('fsc', 'reclaimed wood', 'sustainably sourced wood'),
}

ENERGY_SIGNALS = {
    'Solar Powered': ('solar',),
    'Energy Efficient': ('energy efficient', 'energy-efficient', 'low power', 'led'),
    'Renewable Energy': ('renewable',),
    'Rechargeable': ('rechargeable', 'reusable battery'),
}

LIFECYCLE_SIGNALS = {
    'Compostable': ('compostable', 'compost'),
    'Biodegradable': ('biodegradable', 'biodegrade'),
    'Reusable': ('reusable', 'refillable', 'refill'),
    'Zero Waste': ('zero waste', 'zero-waste', 'plastic free', 'plastic-free'),
    'Plastic Free Packaging': ('minimal packaging', 'plastic free packaging'),
    'Repairable': ('repairable', 'replaceable parts', 'spare parts'),
}

CERTIFICATION_SIGNALS = {
    'Fair Trade': ('fair trade', 'fairtrade'),
    'Cruelty Free': ('cruelty free', 'cruelty-free', 'vegan'),
    'Carbon Neutral': ('carbon neutral', 'carbon-neutral', 'climate neutral'),
}

# Unverifiable marketing language. Worth acknowledging — a seller bothering to
# claim it is weak evidence — but deliberately worth very little.
GENERIC_CLAIMS = {
    'Eco Friendly': ('eco-friendly', 'eco friendly', 'ecofriendly', 'eco', 'sustainable', 'green'),
}

PENALTY_SIGNALS = {
    'single_use': ('single use', 'single-use', 'disposable', 'one-time use'),
    'virgin_plastic': ('pvc', 'polystyrene', 'styrofoam'),
    'fast_fashion': ('fast fashion',),
}

# Points per distinct signal found, and the ceiling for each group.
GROUP_WEIGHTS = {
    'material': {'signals': MATERIAL_SIGNALS, 'points': 9, 'cap': 22},
    'energy': {'signals': ENERGY_SIGNALS, 'points': 8, 'cap': 18},
    'lifecycle': {'signals': LIFECYCLE_SIGNALS, 'points': 8, 'cap': 20},
    'certification': {'signals': CERTIFICATION_SIGNALS, 'points': 7, 'cap': 14},
    'generic': {'signals': GENERIC_CLAIMS, 'points': 3, 'cap': 3},
}

PENALTY_POINTS = 12

# --------------------------------------------------------------------------- #
# Category baselines
# --------------------------------------------------------------------------- #
# A starting point reflecting the typical footprint of the category itself,
# independent of any claim. Electronics start low because manufacturing and
# end-of-life dominate their impact; media and groceries start higher.

CATEGORY_BASELINE = {
    'Electronics': 30,
    'Fashion': 38,
    'Beauty & Personal Care': 40,
    'Home & Kitchen': 42,
    'Kitchen': 42,
    'Home & Garden': 45,
    'Fitness': 40,
    'Sports & Fitness': 40,
    'Sports & Outdoors': 40,
    'Toys & Games': 38,
    'Grocery': 50,
    'Books & Media': 52,
}

DEFAULT_BASELINE = 40

# Grade bands. Deliberately not an even 20-point split: the catalogue's
# evidence is sparse, so the top band is kept genuinely hard to reach.
GRADE_BANDS = (
    ('A', 78),
    ('B', 64),
    ('C', 50),
    ('D', 36),
    ('E', 0),
)


def product_text(product) -> str:
    """Flatten everything textual about a product into one lowercase haystack."""
    parts = [product.name or '', product.description or '']

    tags = product.tags
    if isinstance(tags, (list, tuple)):
        parts.extend(str(tag) for tag in tags)
    elif isinstance(tags, dict):
        parts.extend(str(value) for value in tags.values())
    elif tags:
        parts.append(str(tags))

    return ' '.join(parts).lower()


def matched_tags(text: str) -> list[str]:
    """Canonical eco tag names evidenced by `text`.

    'Organic Cotton' and 'Organic' both match "organic cotton"; the more
    specific tag wins so a product is not tagged twice for one claim.
    """
    found: list[str] = []
    for group in ('material', 'energy', 'lifecycle', 'certification', 'generic'):
        for tag_name, needles in GROUP_WEIGHTS[group]['signals'].items():
            if any(needle in text for needle in needles):
                found.append(tag_name)

    if 'Organic Cotton' in found and 'Organic' in found:
        found.remove('Organic')

    return found


def score_product(product) -> tuple[float, list[str]]:
    """Return `(score, eco_tag_names)` for one product.

    Deterministic: the same product always produces the same score, which is
    what makes the number defensible and safe to recompute.
    """
    text = product_text(product)

    category_name = getattr(getattr(product, 'category', None), 'name', '') or ''
    score = float(CATEGORY_BASELINE.get(category_name, DEFAULT_BASELINE))

    tags: list[str] = []
    for group_name in ('material', 'energy', 'lifecycle', 'certification', 'generic'):
        group = GROUP_WEIGHTS[group_name]
        hits = [
            tag_name
            for tag_name, needles in group['signals'].items()
            if any(needle in text for needle in needles)
        ]
        if group_name == 'material' and 'Organic Cotton' in hits and 'Organic' in hits:
            hits.remove('Organic')
        tags.extend(hits)
        score += min(len(hits) * group['points'], group['cap'])

    for needles in PENALTY_SIGNALS.values():
        if any(needle in text for needle in needles):
            score -= PENALTY_POINTS

    score = max(0.0, min(100.0, score))
    return round(score, 1), tags


def grade_for_score(score: float) -> str:
    """Letter band for a 0-100 score."""
    for letter, floor in GRADE_BANDS:
        if score >= floor:
            return letter
    return 'E'
