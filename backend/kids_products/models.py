from django.db import models

class KidsCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Kids Categories"

class KidsProduct(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    age_group = models.ForeignKey('products.AgeGroup', on_delete=models.SET_NULL, null=True, blank=True)
    gender = models.ForeignKey('products.GenderCategory', on_delete=models.SET_NULL, null=True, blank=True)
    category = models.ForeignKey(KidsCategory, on_delete=models.CASCADE, related_name='products')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image_url = models.URLField(blank=True, null=True)
    stock = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
