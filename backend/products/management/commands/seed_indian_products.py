from django.core.management.base import BaseCommand
from django.utils import timezone
from products.models import Category, Product, PriceHistory
from ml_engine.models import PricePrediction
import random
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seed database with Indian market products from Amazon, Flipkart, and Zepto'

    def handle(self, *args, **options):
        self.stdout.write("🌱 Seeding database with Indian market products...")

        # Create/Get categories
        categories_data = [
            {'name': 'Electronics', 'description': 'Mobile phones, laptops, accessories'},
            {'name': 'Fashion', 'description': 'Clothing, shoes, and fashion accessories'},
            {'name': 'Home & Kitchen', 'description': 'Kitchen appliances and home essentials'},
            {'name': 'Books & Media', 'description': 'Books, ebooks, and digital media'},
            {'name': 'Sports & Outdoors', 'description': 'Sports equipment and outdoor gear'},
            {'name': 'Beauty & Personal Care', 'description': 'Cosmetics, skincare, and personal care'},
            {'name': 'Grocery', 'description': 'Fresh and packaged groceries'},
            {'name': 'Toys & Games', 'description': 'Toys and gaming products'},
        ]

        categories = {}
        for cat_data in categories_data:
            cat, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={'description': cat_data['description']}
            )
            categories[cat_data['name']] = cat
            if created:
                self.stdout.write(f"✓ Created category: {cat_data['name']}")

        # Indian Products with realistic prices (in INR converted to decimal)
        # Prices are actual Amazon/Flipkart/Zepto prices converted for display
        products_data = [
            # ===== ELECTRONICS =====
            {
                'name': 'iPhone 15 Pro',
                'category': 'Electronics',
                'description': 'Latest Apple iPhone 15 Pro with A17 Pro chip, stunning display, and advanced camera system',
                'price': 129999,  # ₹1,29,999
                'tags': ['iphone', 'apple', 'smartphone', 'premium', 'tech'],
                'source': 'Amazon'
            },
            {
                'name': 'Samsung Galaxy S24 Ultra',
                'category': 'Electronics',
                'description': 'Flagship Samsung phone with AI features, 200MP camera, and 6.8" display',
                'price': 99999,  # ₹99,999
                'tags': ['samsung', 'galaxy', 'smartphone', 'android', 'flagship'],
                'source': 'Flipkart'
            },
            {
                'name': 'OnePlus 12',
                'category': 'Electronics',
                'description': 'OnePlus flagship killer with 120Hz display, Snapdragon 8 Gen 3, great performance',
                'price': 64999,  # ₹64,999
                'tags': ['oneplus', 'smartphone', 'android', 'flagship'],
                'source': 'Amazon'
            },
            {
                'name': 'Redmi Note 13',
                'category': 'Electronics',
                'description': 'Budget-friendly Xiaomi smartphone with AMOLED display, 108MP camera',
                'price': 16999,  # ₹16,999
                'tags': ['redmi', 'xiaomi', 'smartphone', 'budget', 'android'],
                'source': 'Flipkart'
            },
            {
                'name': 'Realme 12 Pro',
                'category': 'Electronics',
                'description': 'Realme mid-range phone with 50MP AI camera, 120Hz display',
                'price': 24999,  # ₹24,999
                'tags': ['realme', 'smartphone', 'android', 'camera'],
                'source': 'Zepto'
            },
            {
                'name': 'MacBook Air M3',
                'category': 'Electronics',
                'description': 'Thin and powerful MacBook Air with Apple M3 chip, 8GB RAM, 256GB SSD',
                'price': 99900,  # ₹99,900
                'tags': ['macbook', 'apple', 'laptop', 'premium'],
                'source': 'Amazon'
            },
            {
                'name': 'Dell XPS 13',
                'category': 'Electronics',
                'description': 'Premium Windows ultrabook with Intel Core i5, 8GB RAM, FHD display',
                'price': 79999,  # ₹79,999
                'tags': ['dell', 'xps', 'laptop', 'ultrabook', 'windows'],
                'source': 'Flipkart'
            },
            {
                'name': 'ASUS VivoBook 14',
                'category': 'Electronics',
                'description': 'ASUS lightweight laptop for students, Intel Core i5, 8GB RAM',
                'price': 39999,  # ₹39,999
                'tags': ['asus', 'vivobook', 'laptop', 'student', 'portable'],
                'source': 'Amazon'
            },
            {
                'name': 'Apple iPad Pro 11"',
                'category': 'Electronics',
                'description': 'Powerful tablet with M2 chip, stunning Liquid Retina display, Apple Pencil support',
                'price': 99999,  # ₹99,999
                'tags': ['ipad', 'tablet', 'apple', 'premium'],
                'source': 'Flipkart'
            },
            {
                'name': 'Samsung Galaxy Tab S9',
                'category': 'Electronics',
                'description': 'Samsung premium tablet with 11" display, S Pen included, Snapdragon 8 Gen 2',
                'price': 79999,  # ₹79,999
                'tags': ['samsung', 'galaxy', 'tablet', 'android'],
                'source': 'Amazon'
            },
            {
                'name': 'Sony WH-1000XM5 Headphones',
                'category': 'Electronics',
                'description': 'Industry-leading noise-cancelling headphones with 30-hour battery',
                'price': 29990,  # ₹29,990
                'tags': ['sony', 'headphones', 'audio', 'noise-cancelling', 'premium'],
                'source': 'Flipkart'
            },
            {
                'name': 'Samsung Galaxy Buds Live',
                'category': 'Electronics',
                'description': 'Galaxy Buds with ANC, ambient mode, great sound quality',
                'price': 11999,  # ₹11,999
                'tags': ['samsung', 'earbuds', 'audio', 'wireless'],
                'source': 'Amazon'
            },
            {
                'name': 'Boat Airdopes 141',
                'category': 'Electronics',
                'description': 'Budget TWS earbuds with 42-hour battery, touch controls',
                'price': 1499,  # ₹1,499
                'tags': ['boat', 'earbuds', 'wireless', 'budget', 'audio'],
                'source': 'Flipkart'
            },
            {
                'name': 'Apple Watch Series 9',
                'category': 'Electronics',
                'description': 'Advanced smartwatch with ECG, fall detection, fitness tracking',
                'price': 39900,  # ₹39,900
                'tags': ['apple', 'watch', 'smartwatch', 'fitness', 'premium'],
                'source': 'Amazon'
            },
            {
                'name': 'Samsung Galaxy Watch 6',
                'category': 'Electronics',
                'description': 'Samsung smartwatch with Wear OS, health tracking, beautiful AMOLED',
                'price': 24999,  # ₹24,999
                'tags': ['samsung', 'watch', 'smartwatch', 'fitness'],
                'source': 'Flipkart'
            },
            {
                'name': 'DJI Mini 3 Pro Drone',
                'category': 'Electronics',
                'description': 'Compact drone with 4K camera, 38-minute flight time, gimbal stabilization',
                'price': 32499,  # ₹32,499
                'tags': ['dji', 'drone', 'camera', 'aerial', 'tech'],
                'source': 'Amazon'
            },
            {
                'name': 'Philips Hue Smart Lights',
                'category': 'Electronics',
                'description': '4-pack smart LED bulbs with color control via app, 16M colors',
                'price': 12499,  # ₹12,499
                'tags': ['philips', 'smart', 'lights', 'home automation', 'tech'],
                'source': 'Flipkart'
            },
            {
                'name': '65" LG OLED TV',
                'category': 'Electronics',
                'description': 'Premium 4K OLED TV with stunning picture quality, HDR support',
                'price': 149999,  # ₹1,49,999
                'tags': ['lg', 'tv', 'oled', '4k', 'entertainment'],
                'source': 'Amazon'
            },
            {
                'name': 'Samsung 43" 4K Smart TV',
                'category': 'Electronics',
                'description': 'Samsung 4K Smart TV with Crystal UHD, built-in streaming apps',
                'price': 39999,  # ₹39,999
                'tags': ['samsung', 'tv', '4k', 'smart', 'entertainment'],
                'source': 'Flipkart'
            },
            {
                'name': 'Anker PowerCore 26800mAh',
                'category': 'Electronics',
                'description': 'High-capacity power bank for charging multiple devices, 2 USB ports',
                'price': 2499,  # ₹2,499
                'tags': ['anker', 'power bank', 'charging', 'portable'],
                'source': 'Amazon'
            },

            # ===== FASHION =====
            {
                'name': 'Nike Men\'s Running Shoe',
                'category': 'Fashion',
                'description': 'Latest Nike running shoes with responsive cushioning and lightweight design',
                'price': 8999,  # ₹8,999
                'tags': ['nike', 'shoes', 'running', 'sports', 'men'],
                'source': 'Flipkart'
            },
            {
                'name': 'Adidas Women\'s Athletic Shoes',
                'category': 'Fashion',
                'description': 'Comfortable Adidas shoes for gym and casual wear with great arch support',
                'price': 6999,  # ₹6,999
                'tags': ['adidas', 'shoes', 'women', 'athletic', 'sports'],
                'source': 'Amazon'
            },
            {
                'name': 'Puma Men\'s T-Shirt',
                'category': 'Fashion',
                'description': 'Casual Puma t-shirt made from high-quality cotton blend',
                'price': 999,  # ₹999
                'tags': ['puma', 'tshirt', 'casual', 'men', 'clothing'],
                'source': 'Flipkart'
            },
            {
                'name': 'Levi\'s 501 Jeans',
                'category': 'Fashion',
                'description': 'Classic Levi\'s denim jeans with perfect fit and durability',
                'price': 4999,  # ₹4,999
                'tags': ['levis', 'jeans', 'denim', 'men', 'casual'],
                'source': 'Amazon'
            },
            {
                'name': 'Zara Women\'s Dress',
                'category': 'Fashion',
                'description': 'Stylish Zara dress perfect for casual and office occasions',
                'price': 3999,  # ₹3,999
                'tags': ['zara', 'dress', 'women', 'fashion', 'formal'],
                'source': 'Flipkart'
            },
            {
                'name': 'Tommy Hilfiger Polo',
                'category': 'Fashion',
                'description': 'Classic Tommy Hilfiger polo shirt with embroidered logo',
                'price': 2999,  # ₹2,999
                'tags': ['tommy hilfiger', 'polo', 'men', 'casual', 'shirt'],
                'source': 'Amazon'
            },
            {
                'name': 'Allen Solly Formal Shirt',
                'category': 'Fashion',
                'description': 'Formal Allen Solly shirt perfect for office wear',
                'price': 1799,  # ₹1,799
                'tags': ['allen solly', 'shirt', 'formal', 'men', 'office'],
                'source': 'Flipkart'
            },
            {
                'name': 'Wildcraft Backpack',
                'category': 'Fashion',
                'description': 'Durable outdoor backpack with multiple compartments and waterproof',
                'price': 2499,  # ₹2,499
                'tags': ['wildcraft', 'backpack', 'travel', 'outdoor', 'bag'],
                'source': 'Amazon'
            },
            {
                'name': 'Fastrack Analog Watch',
                'category': 'Fashion',
                'description': 'Stylish Fastrack watch with leather strap and analog dial',
                'price': 3499,  # ₹3,499
                'tags': ['fastrack', 'watch', 'analog', 'men', 'fashion'],
                'source': 'Flipkart'
            },
            {
                'name': 'Titan Women\'s Watch',
                'category': 'Fashion',
                'description': 'Elegant Titan watch perfect for women, water-resistant',
                'price': 4999,  # ₹4,999
                'tags': ['titan', 'watch', 'women', 'elegant', 'fashion'],
                'source': 'Amazon'
            },

            # ===== HOME & KITCHEN =====
            {
                'name': 'Philips Pressure Cooker',
                'category': 'Home & Kitchen',
                'description': 'Electric pressure cooker that cooks quickly and safely',
                'price': 12999,  # ₹12,999
                'tags': ['philips', 'cooker', 'kitchen', 'cooking', 'appliance'],
                'source': 'Flipkart'
            },
            {
                'name': 'Instant Pot Duo',
                'category': 'Home & Kitchen',
                'description': 'Multi-use pressure cooker and slow cooker in one',
                'price': 8999,  # ₹8,999
                'tags': ['instant pot', 'cooker', 'multi-use', 'kitchen'],
                'source': 'Amazon'
            },
            {
                'name': 'Bosch Food Processor',
                'category': 'Home & Kitchen',
                'description': 'Powerful food processor for chopping and mixing ingredients',
                'price': 5999,  # ₹5,999
                'tags': ['bosch', 'food processor', 'kitchen', 'appliance'],
                'source': 'Flipkart'
            },
            {
                'name': 'Tefal Non-Stick Cookware Set',
                'category': 'Home & Kitchen',
                'description': 'Premium non-stick cookware set with 5 pieces and glass lids',
                'price': 6499,  # ₹6,499
                'tags': ['tefal', 'cookware', 'non-stick', 'kitchen', 'cooking'],
                'source': 'Amazon'
            },
            {
                'name': 'Stainless Steel Dinner Set',
                'category': 'Home & Kitchen',
                'description': '32-piece stainless steel dinner set for family dining',
                'price': 2999,  # ₹2,999
                'tags': ['stainless steel', 'dinner set', 'kitchen', 'dining'],
                'source': 'Flipkart'
            },
            {
                'name': 'Milton Water Jug',
                'category': 'Home & Kitchen',
                'description': 'Large waterjug perfect for office and home, keeps water cool',
                'price': 799,  # ₹799
                'tags': ['milton', 'water jug', 'kitchen', 'hydration'],
                'source': 'Amazon'
            },
            {
                'name': 'Tupperware Storage Containers',
                'category': 'Home & Kitchen',
                'description': '5-piece airtight storage containers for food preservation',
                'price': 1799,  # ₹1,799
                'tags': ['tupperware', 'storage', 'containers', 'kitchen'],
                'source': 'Flipkart'
            },
            {
                'name': 'Crompton Kettle',
                'category': 'Home & Kitchen',
                'description': 'Electric kettle with auto shut-off and quick heating',
                'price': 899,  # ₹899
                'tags': ['crompton', 'kettle', 'electric', 'kitchen'],
                'source': 'Amazon'
            },
            {
                'name': 'Prestige Gas Stove',
                'category': 'Home & Kitchen',
                'description': 'Compact 2-burner gas stove for kitchen cooking',
                'price': 4499,  # ₹4,499
                'tags': ['prestige', 'stove', 'gas', 'kitchen', 'cooking'],
                'source': 'Flipkart'
            },
            {
                'name': 'Prestige Microwave Oven',
                'category': 'Home & Kitchen',
                'description': '20L microwave oven with 5 power levels and timer',
                'price': 6499,  # ₹6,499
                'tags': ['prestige', 'microwave', 'oven', 'kitchen'],
                'source': 'Amazon'
            },

            # ===== BOOKS & MEDIA =====
            {
                'name': 'Wings of Fire Series',
                'category': 'Books & Media',
                'description': 'Popular fantasy book series for young readers',
                'price': 249,  # ₹249
                'tags': ['wings of fire', 'fantasy', 'books', 'young adult'],
                'source': 'Flipkart'
            },
            {
                'name': 'Educated by Tara Westover',
                'category': 'Books & Media',
                'description': 'Award-winning memoir about a woman who leaves her survivalist family',
                'price': 299,  # ₹299
                'tags': ['biography', 'memoir', 'books', 'non-fiction'],
                'source': 'Amazon'
            },
            {
                'name': 'The Midnight Library',
                'category': 'Books & Media',
                'description': 'Contemporary fiction about parallel lives and second chances',
                'price': 349,  # ₹349
                'tags': ['fiction', 'books', 'contemporary', 'bestseller'],
                'source': 'Flipkart'
            },
            {
                'name': 'Sapiens by Yuval Noah Harari',
                'category': 'Books & Media',
                'description': 'Bestselling book on human history and evolution',
                'price': 499,  # ₹499
                'tags': ['non-fiction', 'history', 'books', 'science'],
                'source': 'Amazon'
            },
            {
                'name': 'Harry Potter Series (Box Set)',
                'category': 'Books & Media',
                'description': 'Complete 7-book Harry Potter series in one beautiful box set',
                'price': 1999,  # ₹1,999
                'tags': ['harry potter', 'fantasy', 'books', 'series'],
                'source': 'Flipkart'
            },

            # ===== SPORTS & OUTDOORS =====
            {
                'name': 'Yoga Mat Premium',
                'category': 'Sports & Outdoors',
                'description': 'Non-slip 6mm yoga mat perfect for all workout styles',
                'price': 999,  # ₹999
                'tags': ['yoga', 'mat', 'fitness', 'exercise', 'gym'],
                'source': 'Amazon'
            },
            {
                'name': 'Dumbbell Set 10kg',
                'category': 'Sports & Outdoors',
                'description': 'Adjustable dumbbell set for home gym with carrying stand',
                'price': 1999,  # ₹1,999
                'tags': ['dumbbell', 'weights', 'gym', 'fitness', 'equipment'],
                'source': 'Flipkart'
            },
            {
                'name': 'Resistance Bands Set',
                'category': 'Sports & Outdoors',
                'description': '5-piece resistance band loop set for strength training',
                'price': 499,  # ₹499
                'tags': ['resistance bands', 'workout', 'fitness', 'home gym'],
                'source': 'Amazon'
            },
            {
                'name': 'Cricket Bat - Professional',
                'category': 'Sports & Outdoors',
                'description': 'High-quality cricket bat made from premium willow',
                'price': 3999,  # ₹3,999
                'tags': ['cricket', 'bat', 'sports', 'equipment'],
                'source': 'Flipkart'
            },
            {
                'name': 'Badminton Set',
                'category': 'Sports & Outdoors',
                'description': 'Complete badminton set with rackets, shuttlecocks, and net',
                'price': 1799,  # ₹1,799
                'tags': ['badminton', 'racket', 'sports', 'outdoor'],
                'source': 'Amazon'
            },
            {
                'name': 'Tennis Racket',
                'category': 'Sports & Outdoors',
                'description': 'Professional tennis racket for competitive play',
                'price': 4999,  # ₹4,999
                'tags': ['tennis', 'racket', 'sports', 'outdoor'],
                'source': 'Flipkart'
            },
            {
                'name': 'Camping Tent 2-Person',
                'category': 'Sports & Outdoors',
                'description': 'Waterproof camping tent for outdoor adventures',
                'price': 2999,  # ₹2,999
                'tags': ['tent', 'camping', 'outdoor', 'travel'],
                'source': 'Amazon'
            },
            {
                'name': 'Trekking Backpack 50L',
                'category': 'Sports & Outdoors',
                'description': 'Large capacity trekking backpack with multiple compartments',
                'price': 3499,  # ₹3,499
                'tags': ['backpack', 'trekking', 'outdoor', 'travel'],
                'source': 'Flipkart'
            },

            # ===== BEAUTY & PERSONAL CARE =====
            {
                'name': 'Lakme Sunscreen SPF 50',
                'category': 'Beauty & Personal Care',
                'description': 'Indian sunscreen with SPF 50 protection from UV damage',
                'price': 299,  # ₹299
                'tags': ['lakme', 'sunscreen', 'skincare', 'beauty'],
                'source': 'Amazon'
            },
            {
                'name': 'Himalaya Face Wash',
                'category': 'Beauty & Personal Care',
                'description': 'Gentle Himalaya face wash for all skin types',
                'price': 149,  # ₹149
                'tags': ['himalaya', 'face wash', 'skincare', 'personal care'],
                'source': 'Flipkart'
            },
            {
                'name': 'Biotique Shampoo',
                'category': 'Beauty & Personal Care',
                'description': 'Natural Biotique shampoo for healthy and shiny hair',
                'price': 199,  # ₹199
                'tags': ['biotique', 'shampoo', 'hair care', 'natural'],
                'source': 'Amazon'
            },
            {
                'name': 'Dove Body Lotion',
                'category': 'Beauty & Personal Care',
                'description': 'Moisturizing body lotion for soft and smooth skin',
                'price': 249,  # ₹249
                'tags': ['dove', 'body lotion', 'skincare', 'moisturizer'],
                'source': 'Flipkart'
            },
            {
                'name': 'MAC Lipstick',
                'category': 'Beauty & Personal Care',
                'description': 'Premium MAC lipstick in vibrant colors with long-lasting formula',
                'price': 899,  # ₹899
                'tags': ['mac', 'lipstick', 'makeup', 'cosmetics', 'premium'],
                'source': 'Amazon'
            },
            {
                'name': 'Maybelline Mascara',
                'category': 'Beauty & Personal Care',
                'description': 'Best-selling mascara for dramatic volume and length',
                'price': 399,  # ₹399
                'tags': ['maybelline', 'mascara', 'makeup', 'eyes'],
                'source': 'Flipkart'
            },

            # ===== GROCERY =====
            {
                'name': 'Aashirvaad Atta (10kg)',
                'category': 'Grocery',
                'description': 'Premium quality wheat flour (atta) for making roti',
                'price': 449,  # ₹449
                'tags': ['aashirvaad', 'atta', 'flour', 'staple', 'grocery'],
                'source': 'Zepto'
            },
            {
                'name': 'Basmati Rice (5kg)',
                'category': 'Grocery',
                'description': 'Premium basmati rice for cooking fragrant rice dishes',
                'price': 499,  # ₹499
                'tags': ['basmati', 'rice', 'staple', 'grocery'],
                'source': 'Amazon'
            },
            {
                'name': 'Sunflower Oil (2L)',
                'category': 'Grocery',
                'description': 'Pure sunflower oil for healthy cooking',
                'price': 249,  # ₹249
                'tags': ['oil', 'sunflower', 'cooking', 'grocery'],
                'source': 'Flipkart'
            },
            {
                'name': 'Haldiram\'s Namkeen',
                'category': 'Grocery',
                'description': 'Traditional Indian snack mix perfect for tea time',
                'price': 199,  # ₹199
                'tags': ['haldiram', 'snack', 'namkeen', 'grocery'],
                'source': 'Zepto'
            },
            {
                'name': 'Bournvita Powder',
                'category': 'Grocery',
                'description': 'Health drink powder to make nutritious hot chocolate',
                'price': 199,  # ₹199
                'tags': ['bournvita', 'drink', 'powder', 'breakfast'],
                'source': 'Amazon'
            },
            {
                'name': 'Amul Butter (500g)',
                'category': 'Grocery',
                'description': 'Fresh Amul butter for spreading or cooking',
                'price': 249,  # ₹249
                'tags': ['amul', 'butter', 'dairy', 'grocery'],
                'source': 'Flipkart'
            },

            # ===== TOYS & GAMES =====
            {
                'name': 'LEGO Creator Set',
                'category': 'Toys & Games',
                'description': 'Creative LEGO set to build various models and structures',
                'price': 1999,  # ₹1,999
                'tags': ['lego', 'toys', 'building', 'creative'],
                'source': 'Amazon'
            },
            {
                'name': 'Remote Control Car',
                'category': 'Toys & Games',
                'description': 'High-speed RC car with rechargeable battery',
                'price': 1499,  # ₹1,499
                'tags': ['rc car', 'remote control', 'toys', 'kids'],
                'source': 'Flipkart'
            },
            {
                'name': 'Board Game - Chess',
                'category': 'Toys & Games',
                'description': 'Classic wooden chess set for strategy game enthusiasts',
                'price': 899,  # ₹899
                'tags': ['chess', 'board game', 'strategy', 'toys'],
                'source': 'Amazon'
            },
            {
                'name': 'Puzzle 1000 Pieces',
                'category': 'Toys & Games',
                'description': 'Brain-teasing jigsaw puzzle with scenic landscape image',
                'price': 499,  # ₹499
                'tags': ['puzzle', 'jigsaw', 'toys', 'brain game'],
                'source': 'Flipkart'
            },
        ]

        for prod_data in products_data:
            product, created = Product.objects.get_or_create(
                name=prod_data['name'],
                defaults={
                    'category': categories[prod_data['category']],
                    'description': prod_data['description'],
                    'current_price': prod_data['price'],
                    'stock': random.randint(10, 500),
                    'tags': prod_data['tags'],
                }
            )

            if created:
                self.stdout.write(f"✓ {prod_data['source']:10} | {prod_data['name']:50} | ₹{prod_data['price']:,}")

                # Create price history (last 60 days with realistic fluctuations)
                current_price = prod_data['price']
                for days_back in range(0, 60):
                    # Simulate realistic price fluctuations (±10%)
                    price_variation = random.uniform(-0.10, 0.10) * current_price
                    historical_price = current_price + price_variation
                    target_date = timezone.now().date() - timedelta(days=days_back)
                    
                    try:
                        PriceHistory.objects.get_or_create(
                            product=product,
                            date=target_date,
                            defaults={'price': max(current_price * 0.5, historical_price)}
                        )
                    except Exception as e:
                        pass

                # Create price prediction
                try:
                    from ml_engine.price_predictor import PricePredictor
                    predictor = PricePredictor()
                    predictor.save_predictions(product)
                except Exception as e:
                    pass
            else:
                self.stdout.write(f"• {prod_data['name']:50} (already exists)")

        self.stdout.write(self.style.SUCCESS('\n✅ Indian products seeded successfully! Total: ' + str(len(products_data)) + ' products'))
        self.stdout.write(self.style.SUCCESS('📱 Products include items from Amazon, Flipkart, and Zepto'))
        self.stdout.write(self.style.SUCCESS('💰 All prices are in Indian Rupees (₹)'))
