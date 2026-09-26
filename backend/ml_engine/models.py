from django.db import models
from products.models import Product
import json

class PricePrediction(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='predictions')
    prediction_date = models.DateField(auto_now_add=True)
    
    # 7-day prediction
    day1_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    day2_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    day3_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    day4_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    day5_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    day6_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    day7_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Price change percentage
    price_change = models.FloatField(default=0.0, help_text="Percentage change in price")
    
    # Recommendation
    recommendation = models.CharField(
        max_length=20, 
        choices=[
            ('best_price', '🟢 Best Price'),
            ('wait', '🟡 Wait - Price Drop Likely'),
            ('neutral', '⚪ Neutral'),
        ],
        default='neutral'
    )
    confidence_score = models.FloatField(default=0.0)
    
    class Meta:
        ordering = ['-prediction_date']
    
    def __str__(self):
        return f"Prediction for {self.product.name} on {self.prediction_date}"


class ImageFeatures(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='image_features_model')
    features_vector = models.JSONField()  # CNN extracted features from ResNet50
    image_hash = models.CharField(max_length=64, unique=True)
    processed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = 'Image Features'
    
    def __str__(self):
        return f"Image Features for {self.product.name}"


class TFIDFIndex(models.Model):
    """Stores TF-IDF matrix for intent-based search"""
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='tfidf_index')
    query_tags = models.JSONField(default=list)  # ["gym shoe", "running shoes", "athletic"]
    tfidf_scores = models.JSONField(default=dict)  # {"tag": score}
    built_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = 'TFIDF Indices'
    
    def __str__(self):
        return f"TF-IDF Index for {self.product.name}"
