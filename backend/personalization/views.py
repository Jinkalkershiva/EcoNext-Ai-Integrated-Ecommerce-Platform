from rest_framework import viewsets, permissions
from .models import UserPreference
from .serializers import UserPreferenceSerializer

class UserPreferenceViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to view or edit their preferences.
    """
    serializer_class = UserPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserPreference.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
