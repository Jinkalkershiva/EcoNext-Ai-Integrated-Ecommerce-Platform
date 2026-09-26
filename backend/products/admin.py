from django.contrib import admin
from .models import (
    Product, Category, PriceHistory, ProductView, ProductSearch,
    SubCategory, AgeGroup, GenderCategory, EcoTag, SkinOrBodyFit, Season, Occasion
)

class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'current_price', 'stock', 'popularity_score', 'sustainability_score')
    list_filter = ('category', 'age_groups', 'gender_categories', 'eco_tags')
    search_fields = ('name', 'description')
    filter_horizontal = ('age_groups', 'gender_categories', 'eco_tags')

admin.site.register(Product, ProductAdmin)
admin.site.register(Category)
admin.site.register(SubCategory)
admin.site.register(AgeGroup)
admin.site.register(GenderCategory)
admin.site.register(EcoTag)
admin.site.register(SkinOrBodyFit)
admin.site.register(Season)
admin.site.register(Occasion)
admin.site.register(PriceHistory)
admin.site.register(ProductView)
admin.site.register(ProductSearch)

