import urllib.parse
from django.core.management.base import BaseCommand
from products.models import Product

class Command(BaseCommand):
    help = 'Assign images to products dynamically based on their names'

    def handle(self, *args, **options):
        self.stdout.write("Updating products with name-based images...")
        
        products = Product.objects.all()
        updated_count = 0

        for product in products:
            # Create a URL-safe search query from the product name
            # We take the first few words to get better results
            search_query = ' '.join(product.name.split()[:4])
            encoded_query = urllib.parse.quote(search_query)
            
            # Using Unsplash source URL pattern for random image matching keywords
            # Added a random seed parameter so products with similar names get different images
            product.image_url = f"https://source.unsplash.com/600x600/?{encoded_query}&sig={product.id}"
            
            product.save()
            self.stdout.write(f"Updated image for: {product.name} -> {product.image_url}")
            updated_count += 1

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully updated {updated_count} products with specific images!'))
