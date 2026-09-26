from django.db import models
from products.models import Product

class DailyStats(models.Model):
    date = models.DateField(auto_now_add=True, unique=True)
    active_users_count = models.IntegerField(default=0)
    total_views = models.IntegerField(default=0)
    total_searches = models.IntegerField(default=0)
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    trending_products = models.JSONField(default=list)  # [{product_id, count}]
    
    class Meta:
        ordering = ['-date']
        verbose_name_plural = 'Daily Stats'
    
    def __str__(self):
        return f"Stats for {self.date}"


class TrendingProduct(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='trending_records')
    rank = models.IntegerField()
    views_count = models.IntegerField()
    searches_count = models.IntegerField()
    purchase_count = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['rank']
        indexes = [
            models.Index(fields=['-timestamp', 'rank']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - Rank #{self.rank}"
