from django.contrib import admin

from .models import CopilotUserPreference


@admin.register(CopilotUserPreference)
class CopilotUserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'max_default_budget', 'updated_at')
    search_fields = ('user__username',)
