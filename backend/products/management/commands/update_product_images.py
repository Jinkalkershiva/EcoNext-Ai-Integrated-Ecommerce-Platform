from django.core.management.base import BaseCommand
from products.models import Product

class Command(BaseCommand):
    help = 'Update all products with high-quality working product images'

    def handle(self, *args, **options):
        self.stdout.write("Updating product images...")

        # Map product names to specific, reliable Unsplash images
        image_map = {
            # === ELECTRONICS ===
            'iPhone 15 Pro': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop',
            'Samsung Galaxy S24 Ultra': 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop',
            'OnePlus 12': 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop',
            'Redmi Note 13': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop',
            'Realme 12 Pro': 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&auto=format&fit=crop',
            'MacBook Air M3': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop',
            'Dell XPS 13': 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&auto=format&fit=crop',
            'ASUS VivoBook 14': 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop',
            'Apple iPad Pro 11"': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop',
            'Samsung Galaxy Tab S9': 'https://images.unsplash.com/photo-1561154464-82e9aab32f34?w=800&auto=format&fit=crop',
            'Sony WH-1000XM5 Headphones': 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&auto=format&fit=crop',
            'Samsung Galaxy Buds Live': 'https://images.unsplash.com/photo-1590658268037-6bf12f032f08?w=800&auto=format&fit=crop',
            'Boat Airdopes 141': 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop',
            'Apple Watch Series 9': 'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=800&auto=format&fit=crop',
            'Samsung Galaxy Watch 6': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop',
            'DJI Mini 3 Pro Drone': 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=800&auto=format&fit=crop',
            'Philips Hue Smart Lights': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&auto=format&fit=crop',
            '65" LG OLED TV': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop',
            'Samsung 43" 4K Smart TV': 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800&auto=format&fit=crop',
            'Anker PowerCore 26800mAh': 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&auto=format&fit=crop',

            # === FASHION ===
            "Nike Men's Running Shoe": 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop',
            "Adidas Women's Athletic Shoes": 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop',
            "Puma Men's T-Shirt": 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop',
            "Levi's 501 Jeans": 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop',
            "Zara Women's Dress": 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop',
            'Tommy Hilfiger Polo': 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&auto=format&fit=crop',
            'Allen Solly Formal Shirt': 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop',
            'Wildcraft Backpack': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop',
            'Fastrack Analog Watch': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&auto=format&fit=crop',
            "Titan Women's Watch": 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&auto=format&fit=crop',

            # === HOME & KITCHEN ===
            'Philips Pressure Cooker': 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&auto=format&fit=crop',
            'Instant Pot Duo': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop',
            'Bosch Food Processor': 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&auto=format&fit=crop',
            'Tefal Non-Stick Cookware Set': 'https://images.unsplash.com/photo-1584990347449-a2d4c2c044c9?w=800&auto=format&fit=crop',
            'Stainless Steel Dinner Set': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop',
            'Milton Water Jug': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop',
            'Tupperware Storage Containers': 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=800&auto=format&fit=crop',
            'Crompton Kettle': 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&auto=format&fit=crop',
            'Prestige Gas Stove': 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=800&auto=format&fit=crop',
            'Prestige Microwave Oven': 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&auto=format&fit=crop',

            # === BOOKS & MEDIA ===
            'Wings of Fire Series': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&auto=format&fit=crop',
            'Educated by Tara Westover': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop',
            'The Midnight Library': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&auto=format&fit=crop',
            'Sapiens by Yuval Noah Harari': 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800&auto=format&fit=crop',
            'Harry Potter Series (Box Set)': 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=800&auto=format&fit=crop',

            # === SPORTS & OUTDOORS ===
            'Yoga Mat Premium': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&auto=format&fit=crop',
            'Dumbbell Set 10kg': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop',
            'Resistance Bands Set': 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800&auto=format&fit=crop',
            'Cricket Bat - Professional': 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop',
            'Badminton Set': 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop',
            'Tennis Racket': 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&auto=format&fit=crop',
            'Camping Tent 2-Person': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop',
            'Trekking Backpack 50L': 'https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=800&auto=format&fit=crop',

            # === BEAUTY & PERSONAL CARE ===
            'Lakme Sunscreen SPF 50': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop',
            'Himalaya Face Wash': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop',
            'Biotique Shampoo': 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&auto=format&fit=crop',
            'Dove Body Lotion': 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&auto=format&fit=crop',
            'MAC Lipstick': 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop',
            'Maybelline Mascara': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop',

            # === GROCERY ===
            'Aashirvaad Atta (10kg)': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop',
            'Basmati Rice (5kg)': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop',
            'Sunflower Oil (2L)': 'https://images.unsplash.com/photo-1474979266404-7eaacdc74ed8?w=800&auto=format&fit=crop',
            "Haldiram's Namkeen": 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&auto=format&fit=crop',
            'Bournvita Powder': 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=800&auto=format&fit=crop',
            'Amul Butter (500g)': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop',

            # === TOYS & GAMES ===
            'LEGO Creator Set': 'https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=800&auto=format&fit=crop',
            'Remote Control Car': 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&auto=format&fit=crop',
            'Board Game - Chess': 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&auto=format&fit=crop',
            'Puzzle 1000 Pieces': 'https://images.unsplash.com/photo-1606503153255-59d8b2e4b0d4?w=800&auto=format&fit=crop',
        }

        updated = 0
        for product in Product.objects.all():
            if product.name in image_map:
                product.image_url = image_map[product.name]
                product.save(update_fields=['image_url'])
                self.stdout.write(f"  OK {product.name}")
                updated += 1
            elif not product.image_url:
                # Fallback: assign category-based image
                cat = product.category.name if product.category else ''
                fallbacks = {
                    'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&auto=format&fit=crop',
                    'Fashion': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&auto=format&fit=crop',
                    'Home & Kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop',
                    'Books & Media': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop',
                    'Sports & Outdoors': 'https://images.unsplash.com/photo-1461896836934-bd45ba8a0dbc?w=800&auto=format&fit=crop',
                    'Beauty & Personal Care': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop',
                    'Grocery': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop',
                    'Toys & Games': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800&auto=format&fit=crop',
                }
                product.image_url = fallbacks.get(cat, 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&auto=format&fit=crop')
                product.save(update_fields=['image_url'])
                self.stdout.write(f"  OK {product.name} (fallback)")
                updated += 1

        self.stdout.write(self.style.SUCCESS(f'\nUpdated images for {updated} products!'))
