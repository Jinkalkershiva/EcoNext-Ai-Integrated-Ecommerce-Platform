from django.contrib import admin
from .models import KidsProduct, KidsCategory

@admin.register(KidsCategory)
class KidsCategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(KidsProduct)
class KidsProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'age_group', 'gender', 'price', 'stock')
    list_filter = ('category', 'age_group', 'gender')
    search_fields = ('name', 'description')
