from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import KidsProduct
from .serializers import KidsProductSerializer

class KidsProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows kids products to be viewed.
    Supports filtering by age_group, gender, category, and price range.
    """
    queryset = KidsProduct.objects.all()
    serializer_class = KidsProductSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = {
        'age_group__name': ['exact'],
        'gender__name': ['exact'],
        'category__name': ['exact'],
        'price': ['gte', 'lte'],
    }
    ordering_fields = ['price', 'created_at']
    ordering = ['-created_at']
