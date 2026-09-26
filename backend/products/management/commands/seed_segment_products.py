from decimal import Decimal
import random

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from products.models import AgeGroup, Category, GenderCategory, Product, PriceHistory


# Real working Unsplash image URLs per product type and segment
SEGMENT_IMAGES = {
    "Kids": {
        "Graphic T-Shirt": "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&auto=format&fit=crop",
        "Hooded Sweatshirt": "https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=800&auto=format&fit=crop",
        "Denim Jeans": "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&auto=format&fit=crop",
        "Running Sneakers": "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&auto=format&fit=crop",
        "Classic Sneakers": "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&auto=format&fit=crop",
        "Backpack": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop",
        "Analog Watch": "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&auto=format&fit=crop",
        "Smartwatch": "https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=800&auto=format&fit=crop",
        "Wireless Earbuds": "https://images.unsplash.com/photo-1590658268037-6bf12f032f2b?w=800&auto=format&fit=crop",
        "Sports Shorts": "https://images.unsplash.com/photo-1562886877-aaaa5c16396e?w=800&auto=format&fit=crop",
        "Track Pants": "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&auto=format&fit=crop",
        "Casual Shirt": "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&auto=format&fit=crop",
        "Formal Shirt": "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&auto=format&fit=crop",
        "Kurta Set": "https://images.unsplash.com/photo-1604006852748-903fccbc4019?w=800&auto=format&fit=crop",
        "Party Dress": "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&auto=format&fit=crop",
        "Sling Bag": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop",
        "Sunglasses": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop",
        "Baseball Cap": "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=800&auto=format&fit=crop",
        "Sports Bottle": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop",
        "Yoga Mat": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&auto=format&fit=crop",
        "Study Table Lamp": "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=800&auto=format&fit=crop",
        "Laptop Sleeve": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop",
        "Phone Case": "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&auto=format&fit=crop",
        "Portable Speaker": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop",
        "Classic Sandals": "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&auto=format&fit=crop",
    },
    "Teens": {
        "Graphic T-Shirt": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop",
        "Hooded Sweatshirt": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop",
        "Denim Jeans": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop",
        "Running Sneakers": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop",
        "Classic Sneakers": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop",
        "Backpack": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop",
        "Analog Watch": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop",
        "Smartwatch": "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop",
        "Wireless Earbuds": "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800&auto=format&fit=crop",
        "Sports Shorts": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop",
        "Track Pants": "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&auto=format&fit=crop",
        "Casual Shirt": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop",
        "Formal Shirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop",
        "Kurta Set": "https://images.unsplash.com/photo-1604006852748-903fccbc4019?w=800&auto=format&fit=crop",
        "Party Dress": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop",
        "Sling Bag": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop",
        "Sunglasses": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop",
        "Baseball Cap": "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=800&auto=format&fit=crop",
        "Sports Bottle": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop",
        "Yoga Mat": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&auto=format&fit=crop",
        "Study Table Lamp": "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=800&auto=format&fit=crop",
        "Laptop Sleeve": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop",
        "Phone Case": "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&auto=format&fit=crop",
        "Portable Speaker": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop",
        "Classic Sandals": "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&auto=format&fit=crop",
    },
    "Men": {
        "Graphic T-Shirt": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop",
        "Hooded Sweatshirt": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&auto=format&fit=crop",
        "Denim Jeans": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop",
        "Running Sneakers": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop",
        "Classic Sneakers": "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&auto=format&fit=crop",
        "Backpack": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop",
        "Analog Watch": "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&auto=format&fit=crop",
        "Smartwatch": "https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=800&auto=format&fit=crop",
        "Wireless Earbuds": "https://images.unsplash.com/photo-1590658268037-6bf12f032f2b?w=800&auto=format&fit=crop",
        "Sports Shorts": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop",
        "Track Pants": "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&auto=format&fit=crop",
        "Casual Shirt": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop",
        "Formal Shirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop",
        "Kurta Set": "https://images.unsplash.com/photo-1604006852748-903fccbc4019?w=800&auto=format&fit=crop",
        "Party Dress": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop",
        "Sling Bag": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop",
        "Sunglasses": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop",
        "Baseball Cap": "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=800&auto=format&fit=crop",
        "Sports Bottle": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop",
        "Yoga Mat": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&auto=format&fit=crop",
        "Study Table Lamp": "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=800&auto=format&fit=crop",
        "Laptop Sleeve": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop",
        "Phone Case": "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&auto=format&fit=crop",
        "Portable Speaker": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop",
        "Classic Sandals": "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&auto=format&fit=crop",
    },
    "Women": {
        "Graphic T-Shirt": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop",
        "Hooded Sweatshirt": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop",
        "Denim Jeans": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop",
        "Running Sneakers": "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&auto=format&fit=crop",
        "Classic Sneakers": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop",
        "Backpack": "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&auto=format&fit=crop",
        "Analog Watch": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&auto=format&fit=crop",
        "Smartwatch": "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop",
        "Wireless Earbuds": "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800&auto=format&fit=crop",
        "Sports Shorts": "https://images.unsplash.com/photo-1562886877-aaaa5c16396e?w=800&auto=format&fit=crop",
        "Track Pants": "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&auto=format&fit=crop",
        "Casual Shirt": "https://images.unsplash.com/photo-1434389677669-e08b4cda3883?w=800&auto=format&fit=crop",
        "Formal Shirt": "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800&auto=format&fit=crop",
        "Kurta Set": "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&auto=format&fit=crop",
        "Party Dress": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop",
        "Sling Bag": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop",
        "Sunglasses": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop",
        "Baseball Cap": "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&auto=format&fit=crop",
        "Sports Bottle": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop",
        "Yoga Mat": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop",
        "Study Table Lamp": "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=800&auto=format&fit=crop",
        "Laptop Sleeve": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop",
        "Phone Case": "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&auto=format&fit=crop",
        "Portable Speaker": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop",
        "Classic Sandals": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop",
    },
    "Unisex": {
        "Graphic T-Shirt": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop",
        "Hooded Sweatshirt": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop",
        "Denim Jeans": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop",
        "Running Sneakers": "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&auto=format&fit=crop",
        "Classic Sneakers": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop",
        "Backpack": "https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=800&auto=format&fit=crop",
        "Analog Watch": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop",
        "Smartwatch": "https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=800&auto=format&fit=crop",
        "Wireless Earbuds": "https://images.unsplash.com/photo-1590658268037-6bf12f032f2b?w=800&auto=format&fit=crop",
        "Sports Shorts": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop",
        "Track Pants": "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&auto=format&fit=crop",
        "Casual Shirt": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop",
        "Formal Shirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop",
        "Kurta Set": "https://images.unsplash.com/photo-1604006852748-903fccbc4019?w=800&auto=format&fit=crop",
        "Party Dress": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop",
        "Sling Bag": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop",
        "Sunglasses": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop",
        "Baseball Cap": "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=800&auto=format&fit=crop",
        "Sports Bottle": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop",
        "Yoga Mat": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&auto=format&fit=crop",
        "Study Table Lamp": "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=800&auto=format&fit=crop",
        "Laptop Sleeve": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop",
        "Phone Case": "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&auto=format&fit=crop",
        "Portable Speaker": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop",
        "Classic Sandals": "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&auto=format&fit=crop",
    },
}


BASE_ITEMS = [
    {"name": "Graphic T-Shirt", "category": "Fashion", "price": (599, 1499), "tags": ["tshirt", "casual", "cotton"]},
    {"name": "Hooded Sweatshirt", "category": "Fashion", "price": (1299, 2899), "tags": ["hoodie", "winter", "casual"]},
    {"name": "Denim Jeans", "category": "Fashion", "price": (1499, 3499), "tags": ["denim", "jeans", "daily wear"]},
    {"name": "Running Sneakers", "category": "Fashion", "price": (1999, 4999), "tags": ["shoes", "running", "sports"]},
    {"name": "Classic Sneakers", "category": "Fashion", "price": (1699, 4299), "tags": ["shoes", "streetwear", "lifestyle"]},
    {"name": "Backpack", "category": "Fashion", "price": (899, 2499), "tags": ["bag", "travel", "daily carry"]},
    {"name": "Analog Watch", "category": "Fashion", "price": (1199, 3999), "tags": ["watch", "accessories", "style"]},
    {"name": "Smartwatch", "category": "Electronics", "price": (2499, 9999), "tags": ["smartwatch", "wearable", "fitness"]},
    {"name": "Wireless Earbuds", "category": "Electronics", "price": (1299, 6999), "tags": ["audio", "earbuds", "wireless"]},
    {"name": "Sports Shorts", "category": "Fashion", "price": (699, 1799), "tags": ["shorts", "sports", "gym"]},
    {"name": "Track Pants", "category": "Fashion", "price": (999, 2499), "tags": ["pants", "athleisure", "comfort"]},
    {"name": "Casual Shirt", "category": "Fashion", "price": (999, 2799), "tags": ["shirt", "casual", "weekend"]},
    {"name": "Formal Shirt", "category": "Fashion", "price": (1199, 3299), "tags": ["shirt", "formal", "office"]},
    {"name": "Kurta Set", "category": "Fashion", "price": (1399, 3999), "tags": ["ethnic", "traditional", "festival"]},
    {"name": "Party Dress", "category": "Fashion", "price": (1699, 4599), "tags": ["dress", "party", "fashion"]},
    {"name": "Sling Bag", "category": "Fashion", "price": (999, 2699), "tags": ["bag", "sling", "accessories"]},
    {"name": "Sunglasses", "category": "Fashion", "price": (799, 2999), "tags": ["sunglasses", "uv", "accessories"]},
    {"name": "Baseball Cap", "category": "Fashion", "price": (499, 1499), "tags": ["cap", "street", "summer"]},
    {"name": "Sports Bottle", "category": "Sports & Outdoors", "price": (399, 1199), "tags": ["bottle", "hydration", "sports"]},
    {"name": "Yoga Mat", "category": "Sports & Outdoors", "price": (899, 2499), "tags": ["yoga", "fitness", "exercise"]},
    {"name": "Study Table Lamp", "category": "Home & Kitchen", "price": (699, 2299), "tags": ["lamp", "study", "lighting"]},
    {"name": "Laptop Sleeve", "category": "Electronics", "price": (599, 1799), "tags": ["laptop", "sleeve", "protection"]},
    {"name": "Phone Case", "category": "Electronics", "price": (399, 1399), "tags": ["phone", "case", "accessories"]},
    {"name": "Portable Speaker", "category": "Electronics", "price": (1399, 5499), "tags": ["speaker", "music", "portable"]},
    {"name": "Classic Sandals", "category": "Fashion", "price": (799, 2499), "tags": ["sandals", "footwear", "daily wear"]},
]


SEGMENTS = {
    "Kids": {
        "age_group": "Kids",
        "gender": None,
    },
    "Teens": {
        "age_group": "Teens",
        "gender": None,
    },
    "Men": {
        "age_group": "Adults",
        "gender": "Men",
    },
    "Women": {
        "age_group": "Adults",
        "gender": "Women",
    },
    "Unisex": {
        "age_group": "Adults",
        "gender": "Unisex",
    },
}


class Command(BaseCommand):
    help = "Seed 25 products each for Kids, Teens, Men, Women, and Unisex with real Unsplash images."

    def handle(self, *args, **options):
        random.seed(2026)

        self.stdout.write("Seeding segment products (25 per segment) with real images...")

        # Ensure categories exist
        for category_name in ["Fashion", "Electronics", "Sports & Outdoors", "Home & Kitchen"]:
            Category.objects.get_or_create(name=category_name, defaults={"description": f"{category_name} products"})

        # Ensure age groups exist
        for age_name in ["Kids", "Teens", "Adults"]:
            AgeGroup.objects.get_or_create(name=age_name)

        # Ensure gender categories exist
        for gender_name in ["Men", "Women", "Unisex"]:
            GenderCategory.objects.get_or_create(name=gender_name)

        created_count = 0
        updated_count = 0

        for segment_name, segment_meta in SEGMENTS.items():
            age_group = AgeGroup.objects.get(name=segment_meta["age_group"])
            gender_name = segment_meta["gender"]
            gender = GenderCategory.objects.get(name=gender_name) if gender_name else None

            for i, item in enumerate(BASE_ITEMS, start=1):
                category = Category.objects.get(name=item["category"])

                min_price, max_price = item["price"]
                price = Decimal(str(random.randint(min_price, max_price)))
                stock = random.randint(20, 300)

                product_name = item["name"]

                # Use real Unsplash image URL
                image_url = SEGMENT_IMAGES[segment_name][item["name"]]

                product, created = Product.objects.get_or_create(
                    name=product_name,
                    defaults={
                        "description": f"{segment_name} collection: {item['name']} with premium quality and modern styling.",
                        "category": category,
                        "current_price": price,
                        "image_url": image_url,
                        "stock": stock,
                        "tags": [segment_name.lower()] + item["tags"],
                    },
                )

                if created:
                    created_count += 1

                    # Create 30 days of price history
                    for days_back in range(0, 30):
                        price_variation = random.uniform(-0.08, 0.08) * float(price)
                        historical_price = float(price) + price_variation
                        target_date = timezone.now().date() - timedelta(days=days_back)
                        try:
                            PriceHistory.objects.get_or_create(
                                product=product,
                                date=target_date,
                                defaults={"price": max(float(price) * 0.5, historical_price)}
                            )
                        except Exception:
                            pass
                else:
                    product.category = category
                    product.current_price = price
                    product.image_url = image_url
                    product.stock = stock
                    product.tags = [segment_name.lower()] + item["tags"]
                    product.save(update_fields=["category", "current_price", "image_url", "stock", "tags", "updated_at"])
                    updated_count += 1

                product.age_groups.set([age_group])
                if gender:
                    product.gender_categories.set([gender])
                else:
                    product.gender_categories.clear()

            self.stdout.write(f"  {segment_name}: 25 products done")

        self.stdout.write(f"Done. Created: {created_count}, Updated: {updated_count}")
        self.stdout.write(f"Total segment products: {created_count + updated_count}")