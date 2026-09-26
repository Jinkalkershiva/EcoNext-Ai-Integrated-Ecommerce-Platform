from django.urls import path

from .views import CopilotAPIView


urlpatterns = [
    path('', CopilotAPIView.as_view(), name='copilot-endpoint'),
]
