from django.core.management.base import BaseCommand
from products.models import Product, PriceHistory
from django.db import transaction

class Command(BaseCommand):
    help = 'Fix product prices that were incorrectly multiplied by the currency updater'

    def handle(self, *args, **options):
        self.stdout.write("Fixing product prices...")
        
        # Original prices from seed_indian_products.py (already in INR)
        indian_prices = {
            'iPhone 15 Pro': 129999, 'Samsung Galaxy S24 Ultra': 99999, 'OnePlus 12': 64999,
            'Redmi Note 13': 16999, 'Realme 12 Pro': 24999, 'MacBook Air M3': 99900,
            'Dell XPS 13': 79999, 'ASUS VivoBook 14': 39999, 'Apple iPad Pro 11"': 99999,
            'Samsung Galaxy Tab S9': 79999, 'Sony WH-1000XM5 Headphones': 29990,
            'Samsung Galaxy Buds Live': 11999, 'Boat Airdopes 141': 1499,
            'Apple Watch Series 9': 39900, 'Samsung Galaxy Watch 6': 24999,
            'DJI Mini 3 Pro Drone': 32499, 'Philips Hue Smart Lights': 12499,
            '65" LG OLED TV': 149999, 'Samsung 43" 4K Smart TV': 39999,
            'Anker PowerCore 26800mAh': 2499, 'Nike Men\'s Running Shoe': 8999,
            'Adidas Women\'s Athletic Shoes': 6999, 'Puma Men\'s T-Shirt': 999,
            'Levi\'s 501 Jeans': 4999, 'Zara Women\'s Dress': 3999,
            'Tommy Hilfiger Polo': 2999, 'Allen Solly Formal Shirt': 1799,
            'Wildcraft Backpack': 2499, 'Fastrack Analog Watch': 3499,
            'Titan Women\'s Watch': 4999, 'Philips Pressure Cooker': 12999,
            'Instant Pot Duo': 8999, 'Bosch Food Processor': 5999,
            'Tefal Non-Stick Cookware Set': 6499, 'Stainless Steel Dinner Set': 2999,
            'Milton Water Jug': 799, 'Tupperware Storage Containers': 1799,
            'Crompton Kettle': 899, 'Prestige Gas Stove': 4499,
            'Prestige Microwave Oven': 6499, 'Wings of Fire Series': 249,
            'Educated by Tara Westover': 299, 'The Midnight Library': 349,
            'Sapiens by Yuval Noah Harari': 499, 'Harry Potter Series (Box Set)': 1999,
            'Yoga Mat Premium': 999, 'Dumbbell Set 10kg': 1999,
            'Resistance Bands Set': 499, 'Cricket Bat - Professional': 3999,
            'Badminton Set': 1799, 'Tennis Racket': 4999, 'Camping Tent 2-Person': 2999,
            'Trekking Backpack 50L': 3499, 'Lakme Sunscreen SPF 50': 299,
            'Himalaya Face Wash': 149, 'Biotique Shampoo': 199, 'Dove Body Lotion': 249,
            'MAC Lipstick': 899, 'Maybelline Mascara': 399, 'Aashirvaad Atta (10kg)': 449,
            'Basmati Rice (5kg)': 499, 'Sunflower Oil (2L)': 249, 'Haldiram\'s Namkeen': 199,
            'Bournvita Powder': 199, 'Amul Butter (500g)': 249, 'LEGO Creator Set': 1999,
            'Remote Control Car': 1499, 'Board Game - Chess': 899, 'Puzzle 1000 Pieces': 499,
        }

        # Original prices from seed_data.py (in USD, need to be multiplied by 83.5 once)
        usd_prices = {
            'Wireless Bluetooth Speaker': 49.99, 'Solar Power Bank 20000mAh': 39.99,
            'Wireless Headphones': 129.99, 'USB-C Fast Charger': 39.99,
            'Bamboo Phone Stand': 12.99, 'LED Desk Lamp - Solar': 34.99,
            'Digital Kitchen Scale': 19.99, 'Smart Temperature Monitor': 24.99,
            'Eco Wireless Mouse': 22.99, 'USB Hub Made from Bamboo': 29.99,
            'Yoga Mat Premium': 29.99, # Conflict handled below
            'Stainless Steel Water Bottle': 24.99, 'Dumbbells Set - 20 lbs': 89.99,
            'Resistance Bands Set': 21.99, 'Bamboo Yoga Block Set': 18.99,
            'Hemp Yoga Strap': 14.99, 'Sustainable Jumping Rope': 16.99,
            'Cork Foam Roller': 31.99, 'Bamboo Scale': 26.99,
            'Organic Cotton Sports Top': 34.99, 'Organic Bamboo Cutting Board Set': 34.99,
            'Stainless Steel Cookware Set': 89.99, 'Bamboo Utensil Set': 12.99,
            'Glass Food Storage Containers': 39.99, 'Organic Bamboo Straws': 9.99,
            'Electric Kettle - Energy Efficient': 29.99, 'Bamboo Knife Block': 24.99,
            'Cast Iron Pan - Eco': 44.99, 'Beeswax Food Wraps': 14.99,
            'Bamboo Colander': 17.99, 'Organic Cotton T-Shirt': 19.99,
            'Hemp Canvas Backpack': 59.99, 'Organic Cotton Socks': 21.99,
            'Linen Shorts': 34.99, 'Recycled Plastic Trainer Shoes': 79.99,
            'Bamboo Fiber Yoga Leggings': 44.99, 'Cork Leather Wallet': 27.99,
            'Bamboo Sunglasses': 49.99, 'Recycled Denim Jacket': 69.99,
            'Organic Cotton Hoodie': 44.99, 'Plant Pot with Saucer': 14.99,
            'Bamboo Plant Stand': 49.99, 'Eco-Friendly Soil': 12.99,
            'Wooden Bird House': 24.99, 'Bamboo Garden Tool Set': 31.99,
            'Recycled Plastic Watering Can': 14.99, 'Composting Bin Set': 79.99,
            'Solar Garden Lights': 29.99, 'Bamboo Raised Garden Bed': 99.99,
            'Natural Rubber Door Mat': 21.99,
        }

        conversion_rate = 83.5
        updated_count = 0

        with transaction.atomic():
            for product in Product.objects.all():
                new_price = None
                
                # Check Indian prices first
                if product.name in indian_prices:
                    # In seed lists, "Yoga Mat Premium" is in both. In Indian it's 999. In USD it's 29.99.
                    # We will default to Indian if it's there.
                    new_price = indian_prices[product.name]
                elif product.name in usd_prices:
                    new_price = round(usd_prices[product.name] * conversion_rate, 2)
                
                if new_price and product.current_price != new_price:
                    product.current_price = new_price
                    product.save()
                    updated_count += 1
                    
                    # Also fix the price history for this product
                    for history in product.price_history.all():
                        history.price = new_price
                        history.save()

        self.stdout.write(self.style.SUCCESS(f'Successfully fixed prices for {updated_count} products!'))
