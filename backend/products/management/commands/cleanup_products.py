"""
Management command to clean up duplicate products and assign unique,
product-specific images to every item in the catalog.

Run with: python manage.py cleanup_products
"""
from django.core.management.base import BaseCommand
from django.db.models import Count
from products.models import Product, PriceHistory


# Every product gets its own unique, curated Unsplash image URL.
# These are direct Unsplash photo URLs that reliably serve images.
PRODUCT_IMAGE_MAP = {
    # ===== ELECTRONICS =====
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
    'Apple MacBook Pro 14-inch (M3 Pro chip, 18GB RAM, 512GB SSD) - Space Black': 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop',
    'ASUS ROG Strix G16 (2024) Gaming Laptop': 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop',
    'Nintendo Switch OLED Model w/ White Joy-Con': 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?w=800&auto=format&fit=crop',

    # ===== FASHION =====
    "Nike Men's Running Shoe": 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop',
    "Adidas Women's Athletic Shoes": 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop',
    "Puma Men's T-Shirt": 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop',
    "Levi's 501 Jeans": 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop',
    "Zara Women's Dress": 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop',
    'Tommy Hilfiger Polo': 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&auto=format&fit=crop',
    'Allen Solly Formal Shirt': 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop',
    'Wildcraft Backpack': 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&auto=format&fit=crop',
    'Fastrack Analog Watch': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&auto=format&fit=crop',
    "Titan Women's Watch": 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&auto=format&fit=crop',
    "Nike Air Force 1 '07 Men's Shoes": 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&auto=format&fit=crop',
    "Fossil Men's Grant Stainless Steel Quartz Chronograph Watch": 'https://images.unsplash.com/photo-1539874754764-5a96559165b0?w=800&auto=format&fit=crop',
    "Women's Classic Trench Coat": 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop',
    'Ray-Ban Classic Wayfarer Sunglasses': 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop',
    'Organic Cotton T-Shirt': 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop',
    'Hemp Canvas Backpack': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop',
    'Organic Cotton Socks': 'https://images.unsplash.com/photo-1586350977771-b3b0ed1afb0b?w=800&auto=format&fit=crop',
    'Linen Shorts': 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop',
    'Recycled Plastic Trainer Shoes': 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&auto=format&fit=crop',
    'Bamboo Fiber Yoga Leggings': 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&auto=format&fit=crop',
    'Cork Leather Wallet': 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop',
    'Bamboo Sunglasses': 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&auto=format&fit=crop',
    'Recycled Denim Jacket': 'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=800&auto=format&fit=crop',
    'Organic Cotton Hoodie': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop',

    # ===== HOME & KITCHEN =====
    'Philips Pressure Cooker': 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&auto=format&fit=crop',
    'Instant Pot Duo': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop',
    'Bosch Food Processor': 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&auto=format&fit=crop',
    'Tefal Non-Stick Cookware Set': 'https://images.unsplash.com/photo-1584990347449-a2d4c2c044c9?w=800&auto=format&fit=crop',
    'Stainless Steel Dinner Set': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop',
    'Milton Water Jug': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&auto=format&fit=crop',
    'Tupperware Storage Containers': 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=800&auto=format&fit=crop',
    'Crompton Kettle': 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&auto=format&fit=crop',
    'Prestige Gas Stove': 'https://images.unsplash.com/photo-1590515024675-ba67e8643f75?w=800&auto=format&fit=crop',
    'Prestige Microwave Oven': 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&auto=format&fit=crop',
    "Nespresso VertuoPlus Coffee and Espresso Machine by De'Longhi": 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop',
    'Dyson V15 Detect Cordless Vacuum Cleaner': 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop',
    'Ninja Air Fryer Pro 4-in-1': 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&auto=format&fit=crop',
    'Lodge Cast Iron Skillet with Red Silicone Hot Handle Holder, 12-inch': 'https://images.unsplash.com/photo-1584286595398-a59f21d313f5?w=800&auto=format&fit=crop',
    'Mid-Century Modern Upholstered Sofa': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop',

    # ===== KITCHEN (original eco products) =====
    'Organic Bamboo Cutting Board Set': 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=800&auto=format&fit=crop',
    'Stainless Steel Cookware Set': 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&auto=format&fit=crop',
    'Bamboo Utensil Set': 'https://images.unsplash.com/photo-1590794055410-d86b510edb82?w=800&auto=format&fit=crop',
    'Glass Food Storage Containers': 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&auto=format&fit=crop',
    'Organic Bamboo Straws': 'https://images.unsplash.com/photo-1572726829137-facda149e297?w=800&auto=format&fit=crop',
    'Electric Kettle - Energy Efficient': 'https://images.unsplash.com/photo-1594128240471-6e9b2ee51ab4?w=800&auto=format&fit=crop',
    'Bamboo Knife Block': 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&auto=format&fit=crop',
    'Cast Iron Pan - Eco': 'https://images.unsplash.com/photo-1574926054530-540288c8e678?w=800&auto=format&fit=crop',
    'Beeswax Food Wraps': 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&auto=format&fit=crop',
    'Bamboo Colander': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop',

    # ===== BOOKS & MEDIA =====
    'Wings of Fire Series': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&auto=format&fit=crop',
    'Educated by Tara Westover': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop',
    'The Midnight Library': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&auto=format&fit=crop',
    'Sapiens by Yuval Noah Harari': 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800&auto=format&fit=crop',
    'Harry Potter Series (Box Set)': 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=800&auto=format&fit=crop',

    # ===== SPORTS & OUTDOORS =====
    'Yoga Mat Premium': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop',
    'Dumbbell Set 10kg': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop',
    'Resistance Bands Set': 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800&auto=format&fit=crop',
    'Cricket Bat - Professional': 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop',
    'Badminton Set': 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop',
    'Tennis Racket': 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&auto=format&fit=crop',
    'Camping Tent 2-Person': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop',
    'Trekking Backpack 50L': 'https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=800&auto=format&fit=crop',

    # ===== FITNESS (original eco products) =====
    'Stainless Steel Water Bottle': 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&auto=format&fit=crop',
    'Dumbbells Set - 20 lbs': 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=800&auto=format&fit=crop',
    'Bamboo Yoga Block Set': 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&auto=format&fit=crop',
    'Hemp Yoga Strap': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop',
    'Sustainable Jumping Rope': 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800&auto=format&fit=crop',
    'Cork Foam Roller': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&auto=format&fit=crop',
    'Bamboo Scale': 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&auto=format&fit=crop',
    'Organic Cotton Sports Top': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop',

    # ===== BEAUTY & PERSONAL CARE =====
    'Lakme Sunscreen SPF 50': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop',
    'Himalaya Face Wash': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop',
    'Biotique Shampoo': 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&auto=format&fit=crop',
    'Dove Body Lotion': 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&auto=format&fit=crop',
    'MAC Lipstick': 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop',
    'Maybelline Mascara': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop',
    'CeraVe Hydrating Facial Cleanser | 16 oz': 'https://images.unsplash.com/photo-1570194065650-d99fb4d38f15?w=800&auto=format&fit=crop',
    'Philips Norelco Multigroomer All-in-One Trimmer Series 7000': 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800&auto=format&fit=crop',
    'Dior Sauvage Eau de Parfum - 100ml': 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop',
    'Revlon One-Step Volumizer Enhanced 1.0 Hair Dryer and Hot Air Brush': 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&auto=format&fit=crop',

    # ===== GROCERY =====
    'Aashirvaad Atta (10kg)': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop',
    'Basmati Rice (5kg)': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop',
    'Sunflower Oil (2L)': 'https://images.unsplash.com/photo-1474979266404-7eaacdc74ed8?w=800&auto=format&fit=crop',
    "Haldiram's Namkeen": 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&auto=format&fit=crop',
    'Bournvita Powder': 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=800&auto=format&fit=crop',
    'Amul Butter (500g)': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop',

    # ===== TOYS & GAMES =====
    'LEGO Creator Set': 'https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=800&auto=format&fit=crop',
    'Remote Control Car': 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&auto=format&fit=crop',
    'Board Game - Chess': 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&auto=format&fit=crop',
    'Puzzle 1000 Pieces': 'https://images.unsplash.com/photo-1606503153255-59d8b2e4b0d4?w=800&auto=format&fit=crop',

    # ===== ELECTRONICS (original eco products) =====
    'Wireless Bluetooth Speaker': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop',
    'Solar Power Bank 20000mAh': 'https://images.unsplash.com/photo-1585338107529-13afc25806f9?w=800&auto=format&fit=crop',
    'Wireless Headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop',
    'USB-C Fast Charger': 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop',
    'Bamboo Phone Stand': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&auto=format&fit=crop',
    'LED Desk Lamp - Solar': 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=800&auto=format&fit=crop',
    'Digital Kitchen Scale': 'https://images.unsplash.com/photo-1585237672814-8922d5542e7f?w=800&auto=format&fit=crop',
    'Smart Temperature Monitor': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&auto=format&fit=crop',
    'Eco Wireless Mouse': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop',
    'USB Hub Made from Bamboo': 'https://images.unsplash.com/photo-1625842268584-8f3296236571?w=800&auto=format&fit=crop',

    # ===== HOME & GARDEN =====
    'Plant Pot with Saucer': 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&auto=format&fit=crop',
    'Bamboo Plant Stand': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&auto=format&fit=crop',
    'Eco-Friendly Soil': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&auto=format&fit=crop',
    'Wooden Bird House': 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=800&auto=format&fit=crop',
    'Bamboo Garden Tool Set': 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop',
    'Recycled Plastic Watering Can': 'https://images.unsplash.com/photo-1563910904-bfae0cfa2798?w=800&auto=format&fit=crop',
    'Composting Bin Set': 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop',
    'Solar Garden Lights': 'https://images.unsplash.com/photo-1558882224-dda166ffe92d?w=800&auto=format&fit=crop',
    'Bamboo Raised Garden Bed': 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=800&auto=format&fit=crop',
    'Natural Rubber Door Mat': 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&auto=format&fit=crop',

    # ===== SPORTS & FITNESS (Amazon seed) =====
    'Bowflex SelectTech 552 Adjustable Dumbbells': 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&auto=format&fit=crop',
    'YETI Rambler 26 oz Bottle, Vacuum Insulated': 'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=800&auto=format&fit=crop',
    'Fitbit Charge 6 Fitness Tracker': 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b0?w=800&auto=format&fit=crop',
    'Manduka PRO Yoga Mat': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&auto=format&fit=crop',
}

# Products that are duplicate/similar to others and should be removed.
# Format: name of product to DELETE -> name of product to KEEP
DUPLICATES_TO_REMOVE = {
    # Same product, longer name from Amazon/Flipkart seed
    'Samsung Galaxy S24 Ultra 5G (Titanium Gray, 12GB, 256GB Storage)': 'Samsung Galaxy S24 Ultra',
    'Apple iPhone 15 Pro Max (256 GB) - Natural Titanium': 'iPhone 15 Pro',
    'Sony WH-1000XM5 Wireless Noise Canceling Headphones': 'Sony WH-1000XM5 Headphones',
    "Levi's Men's 501 Original Fit Jeans": "Levi's 501 Jeans",
}


class Command(BaseCommand):
    help = 'Remove duplicate products and assign unique images to all products'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== PRODUCT CLEANUP ===\n'))

        # Step 1: Remove duplicate/similar products
        self.stdout.write(self.style.MIGRATE_HEADING('Step 1: Removing duplicate products...'))
        removed_count = 0
        for dup_name, keep_name in DUPLICATES_TO_REMOVE.items():
            dup_products = Product.objects.filter(name=dup_name)
            if dup_products.exists():
                # Delete related price history first, then the product
                for p in dup_products:
                    PriceHistory.objects.filter(product=p).delete()
                    self.stdout.write(f'  [X] Removed: "{p.name}" (ID={p.id}) -- duplicate of "{keep_name}"')
                    p.delete()
                    removed_count += 1
        self.stdout.write(f'  Removed {removed_count} duplicate products.\n')

        # Step 2: Assign unique images to all products
        self.stdout.write(self.style.MIGRATE_HEADING('Step 2: Assigning unique images...'))
        updated_count = 0
        missing_count = 0
        for product in Product.objects.all().order_by('name'):
            if product.name in PRODUCT_IMAGE_MAP:
                new_url = PRODUCT_IMAGE_MAP[product.name]
                if product.image_url != new_url:
                    product.image_url = new_url
                    product.save(update_fields=['image_url'])
                    self.stdout.write(f'  [OK] {product.name}')
                    updated_count += 1
            else:
                missing_count += 1
                self.stdout.write(self.style.WARNING(f'  [?] No image mapped for: "{product.name}" (ID={product.id})'))

        self.stdout.write(f'\n  Updated images for {updated_count} products.')
        if missing_count:
            self.stdout.write(self.style.WARNING(f'  {missing_count} products have no mapped image (kept existing).'))

        # Step 3: Verify no duplicate images remain
        self.stdout.write(self.style.MIGRATE_HEADING('\nStep 3: Checking for shared images...'))
        from django.db.models import Count
        img_dupes = (
            Product.objects.values('image_url')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
            .order_by('-count')
        )
        if img_dupes.exists():
            for d in img_dupes:
                products_with_img = Product.objects.filter(image_url=d['image_url'])
                names = ', '.join([p.name for p in products_with_img])
                self.stdout.write(self.style.WARNING(
                    f'  [!] {d["count"]} products share image: {names}'
                ))
        else:
            self.stdout.write(self.style.SUCCESS('  [OK] All products have unique images!'))

        # Summary
        total = Product.objects.count()
        self.stdout.write(self.style.SUCCESS(f'\n=== DONE! {total} products in catalog, {removed_count} removed, {updated_count} images updated ===\n'))
