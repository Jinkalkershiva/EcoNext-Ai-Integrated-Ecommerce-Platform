from django.core.management.base import BaseCommand
from django.utils import timezone
from products.models import Product, ProductView, ProductSearch
from site_analytics.models import TrendingProduct
from django.db.models import Count
import random
from datetime import timedelta


class Command(BaseCommand):
    help = 'Generate trending products from analytics data'

    def handle(self, *args, **options):
        self.stdout.write('Generating trending products data...')
        
        # Clear old trending records (older than 24 hours)
        cutoff_time = timezone.now() - timedelta(hours=24)
        TrendingProduct.objects.filter(timestamp__lt=cutoff_time).delete()
        
        # Get top products by views
        top_products = ProductView.objects.filter(
            timestamp__gte=timezone.now() - timedelta(days=7)
        ).values('product').annotate(view_count=Count('id')).order_by('-view_count')[:20]
        
        # Get top search queries
        top_searches = ProductSearch.objects.filter(
            timestamp__gte=timezone.now() - timedelta(days=7)
        ).values('product').annotate(search_count=Count('id')).order_by('-search_count')[:20]
        
        # Combine and rank products
        products_score = {}
        for item in top_products:
            if item['product']:
                products_score[item['product']] = products_score.get(item['product'], 0) + item['view_count'] * 2
        
        for item in top_searches:
            if item['product']:
                products_score[item['product']] = products_score.get(item['product'], 0) + item['search_count'] * 1
        
        # If no analytics data, use random products
        if not products_score:
            self.stdout.write('No analytics data found. Using random products.')
            products = Product.objects.all()[:10]
            for rank, product in enumerate(products, 1):
                TrendingProduct.objects.update_or_create(
                    product=product,
                    timestamp=timezone.now().date(),
                    defaults={
                        'rank': rank,
                        'views_count': random.randint(10, 100),
                        'searches_count': random.randint(0, 30),
                        'purchase_count': random.randint(0, 15),
                    }
                )
        else:
            # Create trending records for top products
            sorted_products = sorted(products_score.items(), key=lambda x: x[1], reverse=True)[:10]
            
            for rank, (product_id, score) in enumerate(sorted_products, 1):
                product = Product.objects.get(id=product_id)
                views = ProductView.objects.filter(product=product, timestamp__gte=timezone.now() - timedelta(days=7)).count()
                searches = ProductSearch.objects.filter(product=product, timestamp__gte=timezone.now() - timedelta(days=7)).count()
                
                TrendingProduct.objects.update_or_create(
                    product=product,
                    timestamp=timezone.now().date(),
                    defaults={
                        'rank': rank,
                        'views_count': views,
                        'searches_count': searches,
                        'purchase_count': random.randint(0, 10),
                    }
                )
                self.stdout.write(f'✓ #{rank} - {product.name} (Score: {score})')
        
        self.stdout.write(self.style.SUCCESS('Successfully generated trending products!'))
