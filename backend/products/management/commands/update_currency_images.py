from django.core.management.base import BaseCommand
from products.models import Product, PriceHistory
from django.db import transaction

class Command(BaseCommand):
    help = 'Convert prices to INR and assign working images'

    def handle(self, *args, **options):
        self.stdout.write("Updating products...")
        
        products = Product.objects.all()
        conversion_rate = 83.5  # Approximate USD to INR

        # Reliable working images from Unsplash (direct IDs instead of source.unsplash)
        category_images = {
            'Electronics': [
                'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1550005973-e4d650059344?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop'
            ],
            'Fitness': [
                'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&auto=format&fit=crop'
            ],
            'Kitchen': [
                'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1584346133934-a3afd2a33c4c?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1590794055410-d86b510edb82?w=800&auto=format&fit=crop'
            ],
            'Home & Kitchen': [
                'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1584346133934-a3afd2a33c4c?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1590794055410-d86b510edb82?w=800&auto=format&fit=crop'
            ],
            'Fashion': [
                'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1434389678232-067812f80ee2?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&auto=format&fit=crop'
            ],
            'Beauty & Personal Care': [
                'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&auto=format&fit=crop'
            ],
            'Sports & Fitness': [
                'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&auto=format&fit=crop'
            ],
            'Home & Garden': [
                'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1416879598553-33e1081396b2?w=800&auto=format&fit=crop'
            ]
        }
        
        default_images = [
            'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop'
        ]

        with transaction.atomic():
            for product in products:
                # 1. Convert price to INR
                if product.current_price < 300: # USD prices in seed_data are below 300; INR prices in seed_indian are above
                    product.current_price = round(float(product.current_price) * conversion_rate, 2)
                
                # 2. Fix image
                import random
                cat_name = product.category.name if product.category else ''
                if cat_name in category_images:
                    product.image_url = random.choice(category_images[cat_name])
                else:
                    product.image_url = random.choice(default_images)
                
                product.save()
                
            # Update price history too
            histories = PriceHistory.objects.all()
            for history in histories:
                 if history.price < 300:
                     history.price = round(float(history.price) * conversion_rate, 2)
                     history.save()

        self.stdout.write(self.style.SUCCESS('Successfully updated prices to INR and fixed images!'))
