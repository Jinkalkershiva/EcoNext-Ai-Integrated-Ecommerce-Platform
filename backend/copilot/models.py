from django.conf import settings
from django.db import models


class CopilotUserPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='copilot_preference')
    favorite_categories = models.JSONField(default=list, blank=True)
    max_default_budget = models.IntegerField(null=True, blank=True)
    preferred_brands = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Copilot preference: {self.user_id}"
