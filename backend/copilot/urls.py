from django.urls import path

from .views import CopilotAPIView, ChatAPIView


urlpatterns = [
    path('', CopilotAPIView.as_view(), name='copilot-endpoint'),
    path('chat/', ChatAPIView.as_view(), name='copilot-chat-endpoint'),
    path('chat', ChatAPIView.as_view()),
]
