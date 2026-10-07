from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from decimal import Decimal
from products.models import Product, ProductVariant, ProductReview, ReviewImage
from accounts.models import UserAddress

class Command(BaseCommand):
    help = "Seeds product variants, saved addresses, and reviews for existing products"

    def handle(self, *args, **options):
        self.stdout.write("Seeding product variants...")
        products = Product.objects.all()
        
        # Apparel / sizing products vs standard products
        size_pricing_tiers = [
            ('XXS', Decimal('0.85')),
            ('S', Decimal('0.92')),
            ('M', Decimal('1.00')),
            ('L', Decimal('1.05')),
            ('XL', Decimal('1.08')),
            ('XXL', Decimal('1.14')),
            ('XXXL', Decimal('1.18')),
        ]

        lifestyle_sizes = [
            ('Small (250ml / 500g)', Decimal('0.80')),
            ('Standard (500ml / 1kg)', Decimal('1.00')),
            ('Family Pack (1L / 2kg)', Decimal('1.60')),
            ('Bulk Eco Refill (5L / 5kg)', Decimal('2.80')),
        ]

        variant_count = 0
        for p in products:
            if p.variants.exists():
                continue
            
            base_price = Decimal(str(p.current_price))
            cat_name = (p.category.name if p.category else '').lower()
            
            if any(k in cat_name or k in p.name.lower() for k in ['shirt', 't-shirt', 'apparel', 'wear', 'dress', 'jacket', 'pants', 'trousers', 'fashion', 'men', 'women', 'kids', 'teen']):
                tiers = size_pricing_tiers
            else:
                tiers = lifestyle_sizes

            for idx, (sz, multiplier) in enumerate(tiers):
                var_price = (base_price * multiplier).quantize(Decimal('1.00'))
                orig_price = (var_price * Decimal('1.25')).quantize(Decimal('1.00'))
                sku = f"ECO-{p.id:04d}-{sz[:3].upper().replace(' ', '')}"
                ProductVariant.objects.create(
                    product=p,
                    size=sz,
                    color='Natural / Eco Finish' if idx % 2 == 0 else 'Botanical Olive',
                    sku=sku,
                    price=var_price,
                    original_price=orig_price,
                    stock=15 + (idx * 5),
                    is_active=True
                )
                variant_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {variant_count} product variants across {products.count()} products."))

        # Seed Sample Reviews for top products
        users = list(User.objects.all()[:5])
        if not users:
            u = User.objects.create_user(username='demo_customer', email='customer@econext.org', first_name='Aarav', last_name='Patel')
            users = [u]

        sample_reviews = [
            (5, "Exceptional Quality & 100% Eco-Friendly!", "I have been using this for 3 weeks now. The organic material is super soft, durable, and feels completely premium. Packaging was 100% paper with zero plastic!", True, 24),
            (5, "Loved the sustainability standard!", "Very impressed by the build and finish. The price forecast was accurate — I bought it at the lowest weekly rate. Highly recommend to everyone switching to green living.", True, 18),
            (4, "Great product, fast carbon-neutral delivery", "Delivered in 2 days in a compostable box. Product feels sturdy and high quality. Will definitely purchase again.", True, 9),
            (5, "Worth every rupee", "True to size and color. Soft texture and completely non-toxic. It is so hard to find genuine certified eco products like this.", True, 14),
            (4, "Good sustainable alternative", "Switched from single-use plastics to this. Very satisfying purchase. Rating 4/5 for excellent material quality.", False, 5),
        ]

        review_count = 0
        for p in products[:10]:
            if p.reviews.exists():
                continue
            for idx, (rating, title, comment, is_ver, helpful) in enumerate(sample_reviews):
                u = users[idx % len(users)]
                rev = ProductReview.objects.create(
                    product=p,
                    user=u,
                    rating=rating,
                    title=title,
                    comment=comment,
                    is_verified_purchase=is_ver,
                    helpful_votes=helpful
                )
                review_count += 1
                if idx in [0, 1] and p.image_url:
                    ReviewImage.objects.create(
                        review=rev,
                        image_url=p.image_url
                    )

        self.stdout.write(self.style.SUCCESS(f"Created {review_count} verified customer reviews."))

        # Seed sample addresses for users
        for u in users:
            if not u.saved_addresses.exists():
                UserAddress.objects.create(
                    user=u,
                    address_type='HOME',
                    full_name=f"{u.first_name} {u.last_name}".strip() or u.username,
                    phone='+91 98765 43210',
                    address_line='Flat 402, Green Meadows, 5th Main Eco Sanctuary',
                    landmark='Near Solar Park',
                    city='Bengaluru',
                    state='Karnataka',
                    zipcode='560001',
                    country='India',
                    is_default=True
                )
                UserAddress.objects.create(
                    user=u,
                    address_type='WORK',
                    full_name=f"{u.first_name} {u.last_name}".strip() or u.username,
                    phone='+91 98765 43210',
                    address_line='Suite 8B, Sustainability Tower, Tech Park',
                    landmark='Opposite Metro Station',
                    city='Bengaluru',
                    state='Karnataka',
                    zipcode='560066',
                    country='India',
                    is_default=False
                )

        self.stdout.write(self.style.SUCCESS("Seeded sample saved addresses."))
