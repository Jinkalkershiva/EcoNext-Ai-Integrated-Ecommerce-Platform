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
    
    # Whitelist & Lifecycle Status fields
    is_whitelisted = models.BooleanField(default=False, db_index=True)
    status = models.CharField(max_length=20, default='ACTIVE', db_index=True)  # ACTIVE, ARCHIVED, DRAFT, OUT_OF_STOCK

    # Return Policy & Logistics Physical Attributes
    return_eligible = models.BooleanField(default=True)
    return_window_days = models.IntegerField(default=7)
    return_policy = models.TextField(default="7-day replacement or return")
    condition_required = models.TextField(default="Unused, original tags intact, original packaging required")
    weight_kg = models.DecimalField(max_digits=10, decimal_places=3, default=1.000)
    volume_m3 = models.DecimalField(max_digits=10, decimal_places=4, default=0.0050)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'created_at']),
            models.Index(fields=['name']),
            models.Index(fields=['status']),
            models.Index(fields=['is_whitelisted']),
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


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    size = models.CharField(max_length=50, default='Default')  # e.g. XXS, S, M, L, XL, XXL, XXXL, Free Size
    color = models.CharField(max_length=50, blank=True, default='')
    sku = models.CharField(max_length=100, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.IntegerField(default=25)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product.name} - {self.size} (₹{self.get_price()})"

    def get_price(self):
        return self.price if self.price is not None else self.product.current_price

    class Meta:
        ordering = ['id']


class ProductReview(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='product_reviews')
    rating = models.IntegerField(default=5)  # 1 to 5
    title = models.CharField(max_length=255, blank=True, default='')
    comment = models.TextField()
    is_verified_purchase = models.BooleanField(default=False)
    helpful_votes = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Review ({self.rating}★) for {self.product.name} by {self.user.username}"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', '-created_at']),
        ]


class ReviewImage(models.Model):
    review = models.ForeignKey(ProductReview, on_delete=models.CASCADE, related_name='images')
    image_url = models.URLField(max_length=500, blank=True, null=True)
    image = models.ImageField(upload_to='review_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for Review #{self.review_id}"

    def get_url(self):
        if self.image:
            return self.image.url
        return self.image_url or ''


class ProductInquiry(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='inquiries')
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='product_inquiries')
    sender_type = models.CharField(max_length=20, default='CUSTOMER')  # CUSTOMER, SELLER, SUPPORT, ECOAI
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Inquiry on {self.product.name} by {self.user.username} ({self.sender_type})"

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['product', 'user', 'created_at']),
        ]


