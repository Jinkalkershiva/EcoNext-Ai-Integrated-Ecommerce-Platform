import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from products.models import Category, Product, PriceHistory

class Command(BaseCommand):
    help = 'Seed database with realistic Amazon/Flipkart style products including images'

    def handle(self, *args, **options):
        self.stdout.write("Seeding database with realistic e-commerce data...")

        # Create categories
        categories_data = [
            {'name': 'Electronics', 'description': 'Mobiles, Laptops, Accessories & more'},
            {'name': 'Fashion', 'description': 'Clothing, Shoes, Watches & Accessories'},
            {'name': 'Home & Kitchen', 'description': 'Furniture, Decor, Appliances & more'},
            {'name': 'Beauty & Personal Care', 'description': 'Makeup, Skincare, Haircare'},
            {'name': 'Sports & Fitness', 'description': 'Equipment, Clothing, Shoes'},
        ]

        categories = {}
        for cat_data in categories_data:
            cat, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={'description': cat_data['description']}
            )
            categories[cat_data['name']] = cat
            if created:
                self.stdout.write(f"Created category: {cat_data['name']}")

        # Realistic products with varied images from reliable placeholder/stock sources
        products_data = [
            # Electronics - Smartphones & Accessories
            {
                'name': 'Samsung Galaxy S24 Ultra 5G (Titanium Gray, 12GB, 256GB Storage)',
                'category': 'Electronics',
                'description': 'Meet the new Galaxy S24 Ultra. The ultimate smartphone experience. Featuring the new Snapdragon 8 Gen 3 processor, a 200MP camera system, and the integrated S Pen.',
                'price': 1299.99,
                'image_url': 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=1000&auto=format&fit=crop',
                'tags': ['smartphone', 'samsung', '5g', 'android', 'flagship']
            },
            {
                'name': 'Apple iPhone 15 Pro Max (256 GB) - Natural Titanium',
                'category': 'Electronics',
                'description': 'Forged in titanium and featuring the groundbreaking A17 Pro chip, a customizable Action button, and a more versatile Pro camera system.',
                'price': 1199.00,
                'image_url': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1000&auto=format&fit=crop',
                'tags': ['smartphone', 'apple', 'iphone', 'ios', 'titanium']
            },
            {
                'name': 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
                'category': 'Electronics',
                'description': 'Industry-leading noise cancellation. Magnificent Sound, engineered to perfection. Crystal clear hands-free calling.',
                'price': 398.00,
                'image_url': 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=1000&auto=format&fit=crop',
                'tags': ['headphones', 'sony', 'wireless', 'bluetooth', 'noise-canceling', 'audio']
            },
            {
                'name': 'Apple MacBook Pro 14-inch (M3 Pro chip, 18GB RAM, 512GB SSD) - Space Black',
                'category': 'Electronics',
                'description': 'The most advanced Mac laptop ever. Featuring the blazing-fast M3 Pro chip for heavy workflows, up to 18 hours of battery life, and a stunning Liquid Retina XDR display.',
                'price': 1999.00,
                'image_url': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000&auto=format&fit=crop',
                'tags': ['laptop', 'apple', 'macbook', 'm3', 'pro', 'computer']
            },
             {
                'name': 'ASUS ROG Strix G16 (2024) Gaming Laptop',
                'category': 'Electronics',
                'description': '16" 16:10 FHD 165Hz Display, NVIDIA GeForce RTX 4060, Intel Core i7-13650HX, 16GB DDR5, 1TB PCIe SSD, Wi-Fi 6E, Windows 11',
                'price': 1399.99,
                'image_url': 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=1000&auto=format&fit=crop',
                'tags': ['laptop', 'asus', 'gaming', 'nvidia', 'rtx', 'computer']
            },
            {
                'name': 'Nintendo Switch OLED Model w/ White Joy-Con',
                'category': 'Electronics',
                'description': 'Play at home on the TV or on-the-go with a vibrant 7-inch OLED screen with the Nintendo Switch system - OLED Model.',
                'price': 349.99,
                'image_url': 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?q=80&w=1000&auto=format&fit=crop',
                'tags': ['console', 'nintendo', 'switch', 'gaming', 'oled']
            },

            # Fashion
            {
                'name': 'Levi\'s Men\'s 501 Original Fit Jeans',
                'category': 'Fashion',
                'description': 'The original blue jean since 1873. The original straight fit. All-American style. A blank canvas for self-expression.',
                'price': 79.50,
                'image_url': 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=1000&auto=format&fit=crop',
                'tags': ['jeans', 'levis', 'men', 'clothing', 'denim', 'casual']
            },
            {
                'name': 'Nike Air Force 1 \'07 Men\'s Shoes',
                'category': 'Fashion',
                'description': 'The radiance lives on in the Nike Air Force 1 \'07, the b-ball icon that puts a fresh spin on what you know best: crisp leather, bold details and the perfect amount of flash to make you shine.',
                'price': 115.00,
                'image_url': 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1000&auto=format&fit=crop',
                'tags': ['shoes', 'nike', 'sneakers', 'men', 'footwear', 'casual']
            },
            {
                'name': 'Fossil Men\'s Grant Stainless Steel Quartz Chronograph Watch',
                'category': 'Fashion',
                'description': 'Classic style meets vintage proportions. Modeled after vintage clocks, our Roman numerals are uniquely designed to provide artistic balance to the dial.',
                'price': 149.00,
                'image_url': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=1000&auto=format&fit=crop',
                'tags': ['watch', 'fossil', 'men', 'accessories', 'chronograph', 'timepiece']
            },
            {
                'name': 'Women\'s Classic Trench Coat',
                'category': 'Fashion',
                'description': 'A timeless wardrobe essential, this double-breasted trench coat features a water-resistant finish, belted waist, and classic epaulettes.',
                'price': 185.00,
                'image_url': 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1000&auto=format&fit=crop',
                'tags': ['coat', 'women', 'clothing', 'outerwear', 'classic']
            },
            {
                'name': 'Ray-Ban Classic Wayfarer Sunglasses',
                'category': 'Fashion',
                'description': 'The most recognizable style in the history of sunglasses. The Wayfarer Classic continues to inspire a global movement.',
                'price': 163.00,
                'image_url': 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1000&auto=format&fit=crop',
                'tags': ['sunglasses', 'ray-ban', 'accessories', 'eyewear', 'style']
            },

            # Home & Kitchen
            {
                'name': 'Nespresso VertuoPlus Coffee and Espresso Machine by De\'Longhi',
                'category': 'Home & Kitchen',
                'description': 'Versatile automatic coffee maker. Brews 4 different cup sizes at the touch of a button. Includes complimentary starter set of Nespresso Vertuo capsules.',
                'price': 159.00,
                'image_url': 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?q=80&w=1000&auto=format&fit=crop',
                'tags': ['coffee', 'espresso', 'machine', 'appliance', 'kitchen']
            },
            {
                'name': 'Dyson V15 Detect Cordless Vacuum Cleaner',
                'category': 'Home & Kitchen',
                'description': 'The most powerful, intelligent cordless vacuum. Reveals invisible dust. Intelligently optimizes suction and run time.',
                'price': 749.99,
                'image_url': 'https://images.unsplash.com/photo-1558317374-067fb5f30001?q=80&w=1000&auto=format&fit=crop',
                'tags': ['vacuum', 'dyson', 'cleaning', 'appliance', 'home']
            },
            {
                'name': 'Ninja Air Fryer Pro 4-in-1',
                'category': 'Home & Kitchen',
                'description': 'Enjoy guilt-free food. Air fry with up to 75% less fat than traditional frying methods. 4-quart capacity.',
                'price': 119.99,
                'image_url': 'https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=1000&auto=format&fit=crop',
                'tags': ['air fryer', 'ninja', 'cooking', 'appliance', 'kitchen']
            },
            {
                'name': 'Lodge Cast Iron Skillet with Red Silicone Hot Handle Holder, 12-inch',
                'category': 'Home & Kitchen',
                'description': 'The Lodge Cast Iron 12-inch Skillet and Red Silicone Hot Handle Holder is a staple for any kitchen. Ideal for cooking both indoors and out. Seasoned and ready to use.',
                'price': 29.90,
                'image_url': 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?q=80&w=1000&auto=format&fit=crop',
                'tags': ['pan', 'skillet', 'iron', 'cooking', 'kitchen']
            },
            {
                'name': 'Mid-Century Modern Upholstered Sofa',
                'category': 'Home & Kitchen',
                'description': 'Elevate your living room with this stylish mid-century modern sofa. Features durable fabric, tufted back cushions, and solid wood legs.',
                'price': 599.00,
                'image_url': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop',
                'tags': ['sofa', 'furniture', 'living room', 'decor', 'home']
            },

            # Beauty & Personal Care
            {
                'name': 'CeraVe Hydrating Facial Cleanser | 16 oz',
                'category': 'Beauty & Personal Care',
                'description': 'Daily face wash with hyaluronic acid, ceramides, and glycerin. For normal to dry skin. Fragrance free and non-comedogenic.',
                'price': 15.49,
                'image_url': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop',
                'tags': ['cleanser', 'skincare', 'cerave', 'face', 'beauty']
            },
            {
                'name': 'Philips Norelco Multigroomer All-in-One Trimmer Series 7000',
                'category': 'Beauty & Personal Care',
                'description': '23 piece mens grooming kit for beard, head, body, and face hair styling. No blade oil needed.',
                'price': 59.96,
                'image_url': 'https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=1000&auto=format&fit=crop',
                'tags': ['trimmer', 'grooming', 'philips', 'men', 'shaving']
            },
             {
                'name': 'Dior Sauvage Eau de Parfum - 100ml',
                'category': 'Beauty & Personal Care',
                'description': 'A highly concentrated interpretation of Sauvage, melding extreme freshness with warm oriental tones and fierce beauty that comes to life on the skin.',
                'price': 145.00,
                'image_url': 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1000&auto=format&fit=crop',
                'tags': ['perfume', 'fragrance', 'dior', 'cologne', 'beauty']
            },
            {
                'name': 'Revlon One-Step Volumizer Enhanced 1.0 Hair Dryer and Hot Air Brush',
                'category': 'Beauty & Personal Care',
                'description': 'Style, dry & volumize your hair in one step, max drying power with 30% less frizz and helps reduce hair damage.',
                'price': 39.89,
                'image_url': 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=1000&auto=format&fit=crop',
                'tags': ['hair dryer', 'brush', 'styling', 'revlon', 'beauty']
            },

            # Sports & Fitness
            {
                'name': 'Bowflex SelectTech 552 Adjustable Dumbbells',
                'category': 'Sports & Fitness',
                'description': 'Adjusts from 5 to 52.5 lbs in 2.5 lb increments up to the first 25 lbs. Replaces 15 sets of weights.',
                'price': 429.00,
                'image_url': 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=1000&auto=format&fit=crop',
                'tags': ['dumbbells', 'fitness', 'weights', 'gym', 'workout']
            },
            {
                'name': 'YETI Rambler 26 oz Bottle, Vacuum Insulated',
                'category': 'Sports & Fitness',
                'description': 'Keep your water ice cold on the go. Constructed from 18/8 stainless steel, these bottles are durable and sweat-proof.',
                'price': 40.00,
                'image_url': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=1000&auto=format&fit=crop',
                'tags': ['bottle', 'yeti', 'water', 'hydration', 'sports']
            },
            {
                'name': 'Fitbit Charge 6 Fitness Tracker',
                'category': 'Sports & Fitness',
                'description': 'Fitness tracker with Google apps, heart rate on exercise equipment, built-in GPS, active zone minutes and sleep tracking.',
                'price': 159.95,
                'image_url': 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b0?q=80&w=1000&auto=format&fit=crop',
                'tags': ['fitness tracker', 'fitbit', 'smartwatch', 'health', 'wearable']
            },
            {
                'name': 'Manduka PRO Yoga Mat',
                'category': 'Sports & Fitness',
                'description': 'An ultra-dense and spacious performance yoga mat that has unmatched comfort and cushioning.',
                'price': 138.00,
                'image_url': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?q=80&w=1000&auto=format&fit=crop',
                'tags': ['yoga', 'mat', 'fitness', 'exercise', 'manduka']
            }
        ]

        for prod_data in products_data:
            product, created = Product.objects.get_or_create(
                name=prod_data['name'],
                defaults={
                    'category': categories[prod_data['category']],
                    'description': prod_data['description'],
                    'current_price': prod_data['price'],
                    'image_url': prod_data['image_url'],
                    'stock': random.randint(15, 200),
                    'tags': prod_data['tags'],
                }
            )

            # Update existing if it exists
            if not created:
               product.image_url = prod_data['image_url']
               product.description = prod_data['description']
               product.current_price = prod_data['price']
               product.category = categories[prod_data['category']]
               product.save()
               self.stdout.write(f"Updated product: {prod_data['name']}")
            else:
               self.stdout.write(f"Created product: {prod_data['name']}")

            # Create price history
            current_price = prod_data['price']
            for days_back in range(0, 60):
                # Simulate price fluctuations (between -5% and +5%)
                price_variation = current_price * random.uniform(-0.05, 0.05)
                historical_price = current_price + price_variation
                target_date = timezone.now().date() - timedelta(days=days_back)
                
                try:
                    PriceHistory.objects.get_or_create(
                        product=product,
                        date=target_date,
                        defaults={'price': max(5, round(historical_price, 2))}
                    )
                except Exception as e:
                    # Skip if price history already exists for this date
                    pass

            # Create price prediction
            try:
                from ml_engine.price_predictor import PricePredictor
                predictor = PricePredictor()
                predictor.save_predictions(product)
                self.stdout.write(f"  Created price prediction for {prod_data['name']}")
            except Exception as e:
                self.stdout.write(f"  Warning: Could not create prediction for {prod_data['name']}: {str(e)}")

        self.stdout.write(self.style.SUCCESS('\nAmazon/Flipkart style catalog seeded successfully!'))
