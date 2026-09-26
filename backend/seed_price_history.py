"""
Seed 60-day price history for ALL products with realistic fluctuations.
Run:  python seed_price_history.py
"""
import os, sys, django, random
from datetime import timedelta, date
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "econext.settings")
django.setup()

from products.models import Product, PriceHistory

# Wipe old single-row history
deleted, _ = PriceHistory.objects.all().delete()
print(f"Deleted {deleted} old rows")

DAYS = 60
today = date.today()
products = Product.objects.all()
total = 0

for p in products:
    base = float(p.current_price)
    # Random walk with slight trend
    trend = random.choice([-0.001, 0.0, 0.001, 0.002])
    price = base * random.uniform(0.85, 1.05)  # start somewhere near base

    rows = []
    for d in range(DAYS, 0, -1):
        day = today - timedelta(days=d)
        # daily fluctuation ±2 %
        change = random.gauss(trend, 0.015)
        price *= (1 + change)
        price = max(price, base * 0.5)  # floor at 50% of current
        rows.append(
            PriceHistory(product=p, price=Decimal(str(round(price, 2))), date=day)
        )

    # Also add today = current_price
    rows.append(PriceHistory(product=p, price=p.current_price, date=today))

    PriceHistory.objects.bulk_create(rows, ignore_conflicts=True)
    total += len(rows)

print(f"Seeded {total} price-history rows for {products.count()} products")
print(f"Verify: {PriceHistory.objects.count()} total rows in DB")
