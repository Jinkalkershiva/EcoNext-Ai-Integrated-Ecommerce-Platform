from django.db import models
from django.contrib.auth.models import User
from products.models import AgeGroup, GenderCategory, Category, EcoTag

class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_preference')
    age_group = models.ForeignKey(AgeGroup, on_delete=models.SET_NULL, null=True, blank=True)
    gender_category = models.ForeignKey(GenderCategory, on_delete=models.SET_NULL, null=True, blank=True)
    preferred_categories = models.ManyToManyField(Category, blank=True)
    budget_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    eco_preferences = models.ManyToManyField(EcoTag, blank=True)
    color_preferences = models.JSONField(default=list, blank=True)
    style_preferences = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Preferences"
