from django.db import models
import json

class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Categories'

class SubCategory(models.Model):
    name = models.CharField(max_length=255)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='subcategories')

    def __str__(self):
        return self.name

class AgeGroup(models.Model):
    name = models.CharField(max_length=20, unique=True)  # Kids, Teens, Adults, Seniors

    def __str__(self):
        return self.name

class GenderCategory(models.Model):
    name = models.CharField(max_length=20, unique=True)  # Men, Women, Unisex

    def __str__(self):
        return self.name

class EcoTag(models.Model):
    name = models.CharField(max_length=50, unique=True)  # recycled, organic, etc.

    def __str__(self):
        return self.name

class SkinOrBodyFit(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name

class Season(models.Model):
    name = models.CharField(max_length=50, unique=True) # Summer, Winter, etc.

    def __str__(self):
        return self.name

class Occasion(models.Model):
    name = models.CharField(max_length=50, unique=True) # Casual, Formal, etc.

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    subcategory = models.ForeignKey(SubCategory, on_delete=models.SET_NULL, null=True, blank=True)
    current_price = models.DecimalField(max_digits=10, decimal_places=2)
    image_url = models.URLField(blank=True, null=True)
    stock = models.IntegerField(default=0)
    tags = models.JSONField(default=list)  # For TF-IDF intent-based search
    image_features = models.JSONField(default=dict)  # CNN features for visual search
    
    # Personalization fields
    age_groups = models.ManyToManyField(AgeGroup, blank=True)
    gender_categories = models.ManyToManyField(GenderCategory, blank=True)
    eco_tags = models.ManyToManyField(EcoTag, blank=True)
    skin_or_body_fit = models.ForeignKey(SkinOrBodyFit, on_delete=models.SET_NULL, null=True, blank=True)
    season = models.ForeignKey(Season, on_delete=models.SET_NULL, null=True, blank=True)
    occasion = models.ForeignKey(Occasion, on_delete=models.SET_NULL, null=True, blank=True)
    popularity_score = models.FloatField(default=0.0)
    sustainability_score = models.FloatField(default=0.0)
    auto_tagged = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'created_at']),
            models.Index(fields=['name']),
        ]


class PriceHistory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='price_history')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(db_index=True)
    
    def __str__(self):
        return f"{self.product.name} - ₹{self.price} on {self.date}"
    
    class Meta:
        unique_together = ('product', 'date')
        ordering = ['-date']


class ProductView(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='views')
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['product', '-timestamp']),
        ]


class ProductSearch(models.Model):
    query = models.CharField(max_length=255)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='searches', null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['query', '-timestamp']),
        ]
