from django.core.management.base import BaseCommand
from django.utils import timezone
from products.models import Product, ProductView, ProductSearch
from site_analytics.models import TrendingProduct, DailyStats
from datetime import timedelta
import random


class Command(BaseCommand):
    help = 'Seed analytics data for testing trending products'

    def handle(self, *args, **options):
        self.stdout.write('Seeding analytics data...')
        
        products = Product.objects.all()
        if not products:
            self.stdout.write('No products found. Please run seed_data first.')
            return
        
        # Create sample ProductView records
        for product in products[:15]:  # Views for top 15 products
            for _ in range(random.randint(5, 30)):
                ProductView.objects.create(
                    product=product,
                    timestamp=timezone.now() - timedelta(hours=random.randint(0, 168))
                )
        
        # Create sample ProductSearch records
        search_queries = [
            'eco-friendly', 'sustainable', 'organic', 'green', 'recycled',
            'solar', 'bamboo', 'cotton', 'biodegradable', 'energy',
            'yoga', 'fitness', 'kitchen', 'fashion', 'garden'
        ]
        
        for product in products[:20]:
            for _ in range(random.randint(2, 15)):
                query = random.choice(search_queries)
                ProductSearch.objects.create(
                    query=query,
                    product=product if random.random() > 0.3 else None,
                    timestamp=timezone.now() - timedelta(hours=random.randint(0, 168))
                )
        
        # Create daily stats
        today = timezone.now().date()
        if not DailyStats.objects.filter(date=today).exists():
            daily_stats = DailyStats.objects.create(
                date=today,
                active_users_count=random.randint(50, 200),
                total_views=ProductView.objects.count(),
                total_searches=ProductSearch.objects.count(),
                total_sales=random.uniform(500, 5000),
                trending_products=[{'product_id': p.id, 'count': random.randint(5, 50)} for p in products[:10]]
            )
            self.stdout.write(f'✓ Created daily stats for {today}')
        
        # Create trending products
        trending_products = []
        for rank, product in enumerate(products[:10], 1):
            views = ProductView.objects.filter(product=product).count()
            searches = ProductSearch.objects.filter(product=product).count()
            
            trending, created = TrendingProduct.objects.update_or_create(
                product=product,
                timestamp=timezone.now().date(),
                defaults={
                    'rank': rank,
                    'views_count': views or random.randint(5, 50),
                    'searches_count': searches or random.randint(0, 30),
                    'purchase_count': random.randint(0, 10),
                }
            )
            
            action = 'Created' if created else 'Updated'
            self.stdout.write(f'✓ {action} trending product #{rank}: {product.name}')
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded analytics data!'))
