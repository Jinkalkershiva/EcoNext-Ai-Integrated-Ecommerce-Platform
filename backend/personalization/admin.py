from django.contrib import admin
from .models import UserPreference

class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'age_group', 'gender_category')
    list_filter = ('age_group', 'gender_category')
    search_fields = ('user__username',)

admin.site.register(UserPreference, UserPreferenceAdmin)

