from rest_framework import serializers

from products.models import (
    Product, Category, PriceHistory, ProductSearch,
    SubCategory, AgeGroup, GenderCategory, EcoTag, SkinOrBodyFit, Season, Occasion
)
from accounts.models import UserProfile, ActivityLog
from shop_cart.models import Cart, CartItem
from order_service.models import Order, OrderItem
from ml_engine.models import PricePrediction


class AgeGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgeGroup
        fields = '__all__'

class GenderCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GenderCategory
        fields = '__all__'

class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = '__all__'

class EcoTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = EcoTag
        fields = '__all__'

class SkinOrBodyFitSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkinOrBodyFit
        fields = '__all__'

class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = '__all__'

class OccasionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Occasion
        fields = '__all__'


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']


class ProductSerializer(serializers.ModelSerializer):
    # All nested relations are read_only: this serializer is only ever used for
    # output, and marking them explicitly stops DRF from demanding nested write
    # payloads. Callers should use product_queryset() in products/api_views.py,
    # which prefetches exactly these eight relations.
    category = CategorySerializer(read_only=True)
    subcategory = SubCategorySerializer(read_only=True)
    age_groups = AgeGroupSerializer(many=True, read_only=True)
    gender_categories = GenderCategorySerializer(many=True, read_only=True)
    eco_tags = EcoTagSerializer(many=True, read_only=True)
    skin_or_body_fit = SkinOrBodyFitSerializer(read_only=True)
    season = SeasonSerializer(read_only=True)
    occasion = OccasionSerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'subcategory', 'current_price', 
            'image_url', 'stock', 'tags', 'created_at', 'age_groups', 
            'gender_categories', 'eco_tags', 'skin_or_body_fit', 'season', 
            'occasion', 'popularity_score', 'sustainability_score'
        ]


class PriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceHistory
        fields = ['price', 'date']


class PricePredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricePrediction
        fields = [
            'id', 'product', 'prediction_date', 'day1_price', 'day2_price',
            'day3_price', 'day4_price', 'day5_price', 'day6_price', 'day7_price',
            'price_change', 'recommendation', 'confidence_score'
        ]


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    subtotal = serializers.SerializerMethodField()
    
    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'subtotal', 'added_at']
    
    def get_subtotal(self, obj):
        return str(obj.get_subtotal())


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()
    
    class Meta:
        model = Cart
        fields = ['id', 'items', 'total', 'created_at', 'updated_at']
    
    def get_total(self, obj):
        return str(obj.get_total())


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    subtotal = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'price_at_purchase', 'subtotal']
    
    def get_subtotal(self, obj):
        return str(obj.get_subtotal())


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'status', 'total_price', 'shipping_address',
            'city', 'state', 'zipcode', 'country', 'items', 'created_at'
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone', 'address', 'city', 'state', 'zipcode', 'country', 'preferences']


class ActivityLogSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'action', 'product', 'details', 'timestamp']


class SearchResultSerializer(serializers.Serializer):
    product = ProductSerializer()
    similarity_score = serializers.FloatField()
    intent_match = serializers.CharField()
