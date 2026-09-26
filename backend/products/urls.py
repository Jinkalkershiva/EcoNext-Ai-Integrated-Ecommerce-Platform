from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views
from .views import test

router = DefaultRouter()
router.register(r'age-groups', api_views.AgeGroupViewSet)
router.register(r'gender-categories', api_views.GenderCategoryViewSet)
router.register(r'sub-categories', api_views.SubCategoryViewSet)
router.register(r'eco-tags', api_views.EcoTagViewSet)
router.register(r'skin-or-body-fits', api_views.SkinOrBodyFitViewSet)
router.register(r'seasons', api_views.SeasonViewSet)
router.register(r'occasions', api_views.OccasionViewSet)

urlpatterns = [
    # Test endpoint
    path("test/", test),
    
    # Product endpoints
    path("", api_views.product_list, name="product_list"),
    path("<int:product_id>/", api_views.product_detail, name="product_detail"),
    path("recommendations/", api_views.personalized_recommendations, name="personalized_recommendations"),
    
    # Search endpoints
    path("search/intent/", api_views.intent_search, name="intent_search"),
    path("search/visual/", api_views.visual_search, name="visual_search"),
    path("categories/", api_views.category_browse, name="category_browse"),
    
    # ML endpoints
    path("<int:product_id>/prediction/", api_views.price_prediction, name="price_prediction"),
    path("trending/", api_views.trending_now, name="trending_now"),
    
    # Analytics
    path("search/trending/", api_views.search_history, name="search_history"),

    # Include router URLs
    path('', include(router.urls)),
]
