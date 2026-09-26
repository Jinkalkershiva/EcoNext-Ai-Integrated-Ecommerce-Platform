from django.core.management.base import BaseCommand
from django.utils import timezone
from products.models import Category, Product, PriceHistory
from ml_engine.models import PricePrediction
import random
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seed database with sample products and data'

    def handle(self, *args, **options):
        self.stdout.write("Seeding database with sample data...")

        # Create categories
        categories_data = [
            {'name': 'Electronics', 'description': 'Electronic devices and gadgets'},
            {'name': 'Fitness', 'description': 'Sports and fitness equipment'},
            {'name': 'Kitchen', 'description': 'Kitchen appliances and tools'},
            {'name': 'Fashion', 'description': 'Clothing and accessories'},
            {'name': 'Home & Garden', 'description': 'Home decor and gardening'},
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

        # Sample eco-friendly products
        products_data = [
            # Electronics
            {
                'name': 'Wireless Bluetooth Speaker',
                'category': 'Electronics',
                'description': 'High-quality portable Bluetooth speaker with 360° sound. Solar powered option available.',
                'price': 49.99,
                'tags': ['speaker', 'bluetooth', 'audio', 'portable', 'eco-friendly']
            },
            {
                'name': 'Solar Power Bank 20000mAh',
                'category': 'Electronics',
                'description': 'Eco-friendly solar powered power bank with fast charging',
                'price': 39.99,
                'tags': ['solar', 'power bank', 'charging', 'eco', 'renewable']
            },
            {
                'name': 'Wireless Headphones',
                'category': 'Electronics',
                'description': 'Noise-cancelling wireless headphones with 30-hour battery, made from recycled materials',
                'price': 129.99,
                'tags': ['headphones', 'audio', 'wireless', 'music', 'recycled']
            },
            {
                'name': 'USB-C Fast Charger',
                'category': 'Electronics',
                'description': '65W USB-C fast charger compatible with most devices, energy efficient',
                'price': 39.99,
                'tags': ['charger', 'usb-c', 'fast charging', 'energy efficient']
            },
            {
                'name': 'Bamboo Phone Stand',
                'category': 'Electronics',
                'description': 'Eco-friendly bamboo phone and tablet stand',
                'price': 12.99,
                'tags': ['phone', 'stand', 'bamboo', 'desk', 'eco']
            },
            {
                'name': 'LED Desk Lamp - Solar',
                'category': 'Electronics',
                'description': 'Energy-efficient LED desk lamp with solar charging option',
                'price': 34.99,
                'tags': ['lamp', 'led', 'solar', 'energy efficient', 'desk']
            },
            {
                'name': 'Digital Kitchen Scale',
                'category': 'Electronics',
                'description': 'Precise digital scale for cooking and baking, low-power consumption',
                'price': 19.99,
                'tags': ['scale', 'kitchen', 'cooking', 'measure', 'energy efficient']
            },
            {
                'name': 'Smart Temperature Monitor',
                'category': 'Electronics',
                'description': 'IoT temperature monitor to optimize energy usage in your home',
                'price': 24.99,
                'tags': ['smart', 'energy', 'monitor', 'iot', 'home automation']
            },
            {
                'name': 'Eco Wireless Mouse',
                'category': 'Electronics',
                'description': 'Wireless mouse made from recycled plastic with rechargeable battery',
                'price': 22.99,
                'tags': ['mouse', 'wireless', 'recycled', 'computer', 'eco']
            },
            {
                'name': 'USB Hub Made from Bamboo',
                'category': 'Electronics',
                'description': '7-port USB hub with bamboo casing and energy efficient charging',
                'price': 29.99,
                'tags': ['usb', 'hub', 'bamboo', 'charging', 'eco']
            },
            
            # Fitness
            {
                'name': 'Yoga Mat Premium',
                'category': 'Fitness',
                'description': 'Non-slip TPE yoga mat perfect for all workout styles. Eco-friendly TPE material.',
                'price': 29.99,
                'tags': ['yoga', 'fitness', 'exercise', 'gym', 'eco']
            },
            {
                'name': 'Stainless Steel Water Bottle',
                'category': 'Fitness',
                'description': 'Insulated water bottle keeps drinks cold for 24 hours. Reusable and eco-friendly.',
                'price': 24.99,
                'tags': ['bottle', 'water', 'sports', 'gym', 'reusable']
            },
            {
                'name': 'Dumbbells Set - 20 lbs',
                'category': 'Fitness',
                'description': 'Adjustable dumbbell set with carrying rack, made from recycled materials',
                'price': 89.99,
                'tags': ['dumbbells', 'weights', 'fitness', 'gym', 'recycled']
            },
            {
                'name': 'Resistance Bands Set',
                'category': 'Fitness',
                'description': 'Eco-friendly natural rubber resistance bands for full-body workout',
                'price': 21.99,
                'tags': ['bands', 'resistance', 'fitness', 'workout', 'eco']
            },
            {
                'name': 'Bamboo Yoga Block Set',
                'category': 'Fitness',
                'description': 'Non-slip yoga blocks made from sustainable bamboo',
                'price': 18.99,
                'tags': ['yoga', 'block', 'bamboo', 'fitness', 'eco']
            },
            {
                'name': 'Hemp Yoga Strap',
                'category': 'Fitness',
                'description': 'Strong hemp material yoga strap for deep stretching',
                'price': 14.99,
                'tags': ['yoga', 'strap', 'hemp', 'stretching', 'eco']
            },
            {
                'name': 'Sustainable Jumping Rope',
                'category': 'Fitness',
                'description': 'Cardio jumping rope made from recycled plastic',
                'price': 16.99,
                'tags': ['rope', 'cardio', 'jumping', 'recycled', 'fitness']
            },
            {
                'name': 'Cork Foam Roller',
                'category': 'Fitness',
                'description': 'Natural cork and eco-foam muscle recovery roller',
                'price': 31.99,
                'tags': ['roller', 'recovery', 'cork', 'eco', 'massage']
            },
            {
                'name': 'Bamboo Scale',
                'category': 'Fitness',
                'description': 'Digital weight scale with bamboo platform',
                'price': 26.99,
                'tags': ['scale', 'bamboo', 'weight', 'health', 'eco']
            },
            {
                'name': 'Organic Cotton Sports Top',
                'category': 'Fitness',
                'description': 'Breathable organic cotton sports top for workouts',
                'price': 34.99,
                'tags': ['sports', 'top', 'organic', 'cotton', 'fitness']
            },
            
            # Kitchen
            {
                'name': 'Organic Bamboo Cutting Board Set',
                'category': 'Kitchen',
                'description': 'Set of 3 eco-friendly bamboo cutting boards, naturally antimicrobial',
                'price': 34.99,
                'tags': ['cutting board', 'kitchen', 'bamboo', 'eco', 'food prep']
            },
            {
                'name': 'Stainless Steel Cookware Set',
                'category': 'Kitchen',
                'description': 'Non-toxic stainless steel cookware, durable and recyclable',
                'price': 89.99,
                'tags': ['cookware', 'kitchen', 'stainless steel', 'non-toxic', 'eco']
            },
            {
                'name': 'Bamboo Utensil Set',
                'category': 'Kitchen',
                'description': 'Wooden spoon, fork, and knife set made from sustainable bamboo',
                'price': 12.99,
                'tags': ['utensils', 'bamboo', 'kitchen', 'cooking', 'eco']
            },
            {
                'name': 'Glass Food Storage Containers',
                'category': 'Kitchen',
                'description': 'Set of 5 glass containers with bamboo lids, plastic-free',
                'price': 39.99,
                'tags': ['storage', 'glass', 'bamboo', 'eco', 'kitchen']
            },
            {
                'name': 'Organic Bamboo Straws',
                'category': 'Kitchen',
                'description': '12-piece set of reusable bamboo drinking straws',
                'price': 9.99,
                'tags': ['straws', 'bamboo', 'reusable', 'eco', 'zero waste']
            },
            {
                'name': 'Electric Kettle - Energy Efficient',
                'category': 'Kitchen',
                'description': 'Stainless steel electric kettle with auto shut-off, energy efficient',
                'price': 29.99,
                'tags': ['kettle', 'electric', 'energy efficient', 'kitchen']
            },
            {
                'name': 'Bamboo Knife Block',
                'category': 'Kitchen',
                'description': 'Sustainable bamboo knife holder for kitchen counter',
                'price': 24.99,
                'tags': ['knife', 'block', 'bamboo', 'kitchen', 'storage']
            },
            {
                'name': 'Cast Iron Pan - Eco',
                'category': 'Kitchen',
                'description': 'Durable cast iron cookware, long-lasting and recyclable',
                'price': 44.99,
                'tags': ['pan', 'cast iron', 'durable', 'cooking', 'eco']
            },
            {
                'name': 'Beeswax Food Wraps',
                'category': 'Kitchen',
                'description': 'Natural beeswax wraps to replace plastic wrap',
                'price': 14.99,
                'tags': ['wraps', 'beeswax', 'eco', 'zero waste', 'food']
            },
            {
                'name': 'Bamboo Colander',
                'category': 'Kitchen',
                'description': 'Eco-friendly bamboo colander for draining pasta and vegetables',
                'price': 17.99,
                'tags': ['colander', 'bamboo', 'kitchen', 'draining', 'eco']
            },
            
            # Fashion
            {
                'name': 'Organic Cotton T-Shirt',
                'category': 'Fashion',
                'description': 'Comfortable 100% organic cotton t-shirt, ethically produced',
                'price': 19.99,
                'tags': ['shirt', 'cotton', 'clothing', 'casual', 'organic']
            },
            {
                'name': 'Hemp Canvas Backpack',
                'category': 'Fashion',
                'description': 'Durable hemp canvas backpack with recycled plastic components',
                'price': 59.99,
                'tags': ['backpack', 'hemp', 'eco', 'bag', 'travel']
            },
            {
                'name': 'Organic Cotton Socks',
                'category': 'Fashion',
                'description': 'Pack of 5 pairs of organic cotton socks, comfortable and eco-friendly',
                'price': 21.99,
                'tags': ['socks', 'cotton', 'organic', 'clothing', 'eco']
            },
            {
                'name': 'Linen Shorts',
                'category': 'Fashion',
                'description': 'Natural linen shorts, biodegradable and breathable',
                'price': 34.99,
                'tags': ['shorts', 'linen', 'clothing', 'summer', 'eco']
            },
            {
                'name': 'Recycled Plastic Trainer Shoes',
                'category': 'Fashion',
                'description': 'Comfortable running shoes made from recycled plastic',
                'price': 79.99,
                'tags': ['shoes', 'recycled', 'plastic', 'running', 'eco']
            },
            {
                'name': 'Bamboo Fiber Yoga Leggings',
                'category': 'Fashion',
                'description': 'Breathable leggings made from sustainable bamboo fiber',
                'price': 44.99,
                'tags': ['leggings', 'bamboo', 'yoga', 'fitness', 'eco']
            },
            {
                'name': 'Cork Leather Wallet',
                'category': 'Fashion',
                'description': 'Lightweight wallet made from sustainable cork material',
                'price': 27.99,
                'tags': ['wallet', 'cork', 'eco', 'accessories', 'vegan']
            },
            {
                'name': 'Bamboo Sunglasses',
                'category': 'Fashion',
                'description': 'Stylish sunglasses with bamboo frames and polarized lenses',
                'price': 49.99,
                'tags': ['sunglasses', 'bamboo', 'eco', 'accessories', 'style']
            },
            {
                'name': 'Recycled Denim Jacket',
                'category': 'Fashion',
                'description': 'Classic denim jacket made from upcycled denim material',
                'price': 69.99,
                'tags': ['jacket', 'denim', 'recycled', 'clothing', 'eco']
            },
            {
                'name': 'Organic Cotton Hoodie',
                'category': 'Fashion',
                'description': 'Cozy hoodie made from 100% organic cotton',
                'price': 44.99,
                'tags': ['hoodie', 'cotton', 'organic', 'clothing', 'comfortable']
            },
            
            # Home & Garden
            {
                'name': 'Plant Pot with Saucer',
                'category': 'Home & Garden',
                'description': 'Modern ceramic plant pot with drainage hole and eco-friendly finishes',
                'price': 14.99,
                'tags': ['plant', 'pot', 'garden', 'home decor', 'eco']
            },
            {
                'name': 'Bamboo Plant Stand',
                'category': 'Home & Garden',
                'description': 'Multi-tier bamboo plant stand for indoor garden display',
                'price': 49.99,
                'tags': ['plant', 'stand', 'bamboo', 'garden', 'home']
            },
            {
                'name': 'Eco-Friendly Soil',
                'category': 'Home & Garden',
                'description': '10L bag of organic potting soil with coconut coir and peat-free',
                'price': 12.99,
                'tags': ['soil', 'gardening', 'organic', 'eco', 'plants']
            },
            {
                'name': 'Wooden Bird House',
                'category': 'Home & Garden',
                'description': 'FSC-certified wooden bird house for backyard wildlife',
                'price': 24.99,
                'tags': ['birdhouse', 'wood', 'wildlife', 'garden', 'eco']
            },
            {
                'name': 'Bamboo Garden Tool Set',
                'category': 'Home & Garden',
                'description': 'Set of 3 bamboo-handled garden tools for planting and weeding',
                'price': 31.99,
                'tags': ['tools', 'bamboo', 'garden', 'eco', 'outdoor']
            },
            {
                'name': 'Recycled Plastic Watering Can',
                'category': 'Home & Garden',
                'description': '2-gallon watering can made from recycled plastic',
                'price': 14.99,
                'tags': ['watering', 'can', 'recycled', 'garden', 'eco']
            },
            {
                'name': 'Composting Bin Set',
                'category': 'Home & Garden',
                'description': '2-stage composting bin system made from recycled materials',
                'price': 79.99,
                'tags': ['compost', 'bin', 'recycled', 'eco', 'garden']
            },
            {
                'name': 'Solar Garden Lights',
                'category': 'Home & Garden',
                'description': 'Set of 6 solar-powered garden lights for pathway illumination',
                'price': 29.99,
                'tags': ['lights', 'solar', 'garden', 'renewable', 'eco']
            },
            {
                'name': 'Bamboo Raised Garden Bed',
                'category': 'Home & Garden',
                'description': '4x8 ft bamboo raised garden bed for vegetable growing',
                'price': 99.99,
                'tags': ['garden bed', 'bamboo', 'raised', 'vegetable', 'eco']
            },
            {
                'name': 'Natural Rubber Door Mat',
                'category': 'Home & Garden',
                'description': 'Biodegradable rubber door mat from natural rubber trees',
                'price': 21.99,
                'tags': ['mat', 'rubber', 'door', 'eco', 'home']
            },
        ]

        for prod_data in products_data:
            product, created = Product.objects.get_or_create(
                name=prod_data['name'],
                defaults={
                    'category': categories[prod_data['category']],
                    'description': prod_data['description'],
                    'current_price': prod_data['price'],
                    'stock': random.randint(5, 100),
                    'tags': prod_data['tags'],
                }
            )

            if created:
                self.stdout.write(f"Created product: {prod_data['name']}")

                # Create price history (last 60 days)
                current_price = prod_data['price']
                for days_back in range(0, 60):
                    # Simulate price fluctuations
                    price_variation = random.uniform(-5, 5)
                    historical_price = current_price + price_variation
                    target_date = timezone.now().date() - timedelta(days=days_back)
                    
                    try:
                        PriceHistory.objects.get_or_create(
                            product=product,
                            date=target_date,
                            defaults={'price': max(5, historical_price)}
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
            else:
                self.stdout.write(f"Product exists: {prod_data['name']}")

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
