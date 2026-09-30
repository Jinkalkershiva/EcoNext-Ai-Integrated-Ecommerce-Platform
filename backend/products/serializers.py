from rest_framework import serializers

from products.models import (
    Product, Category, PriceHistory, ProductSearch,
    SubCategory, AgeGroup, GenderCategory, EcoTag, SkinOrBodyFit, Season, Occasion
)
from accounts.models import UserProfile, ActivityLog
from shop_cart.models import Cart, CartItem
from order_service.models import Order, OrderItem, OrderStatusHistory, NotificationLog
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
    category = CategorySerializer(read_only=True)
    subcategory = SubCategorySerializer(read_only=True)
    age_groups = AgeGroupSerializer(many=True, read_only=True)
    gender_categories = GenderCategorySerializer(many=True, read_only=True)
    eco_tags = EcoTagSerializer(many=True, read_only=True)
    skin_or_body_fit = SkinOrBodyFitSerializer(read_only=True)
    season = SeasonSerializer(read_only=True)
    occasion = OccasionSerializer(read_only=True)

    # Aliases for Admin Panel & Microservice DTO compatibility
    price = serializers.DecimalField(source='current_price', max_digits=10, decimal_places=2, read_only=True)
    stockQuantity = serializers.IntegerField(source='stock', read_only=True)
    sku = serializers.SerializerMethodField()
    categoryId = serializers.SerializerMethodField()
    categoryName = serializers.SerializerMethodField()
    sustainabilityScore = serializers.FloatField(source='sustainability_score', read_only=True)
    imageUrl = serializers.CharField(source='image_url', read_only=True)
    additional_images = serializers.SerializerMethodField()
    additionalImages = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'subcategory', 'current_price',
            'price', 'stock', 'stockQuantity', 'sku', 'categoryId', 'categoryName',
            'image_url', 'imageUrl', 'additional_images', 'additionalImages', 'tags', 'status', 'created_at', 'age_groups',
            'gender_categories', 'eco_tags', 'skin_or_body_fit', 'season',
            'occasion', 'popularity_score', 'sustainability_score', 'sustainabilityScore'
        ]

    def get_additional_images(self, obj):
        if isinstance(obj.image_features, dict):
            imgs = obj.image_features.get('additional_images', [])
            if isinstance(imgs, list):
                return imgs
        return []

    def get_additionalImages(self, obj):
        return self.get_additional_images(obj)

    def get_sku(self, obj):
        if isinstance(obj.tags, list):
            for t in obj.tags:
                if isinstance(t, str):
                    if t.upper().startswith('SKU:'):
                        return t.split(':', 1)[1].strip()
                    elif t.upper().startswith('ECO-'):
                        return t.strip()
        return f"ECO-PROD-{obj.id:04d}"

    def get_categoryId(self, obj):
        return obj.category_id if obj.category else None

    def get_categoryName(self, obj):
        return obj.category.name if obj.category else 'Uncategorized'

    def get_status(self, obj):
        if obj.stock > 10:
            return 'ACTIVE'
        elif obj.stock > 0:
            return 'LOW_STOCK'
        return 'OUT_OF_STOCK'


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


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ['id', 'from_status', 'to_status', 'changed_by_name', 'note', 'carrier_name', 'tracking_number', 'timestamp']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    order_reference_number = serializers.CharField(read_only=True)
    canonical_status = serializers.CharField(read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    tracking_timeline = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'order_reference_number', 'status', 'canonical_status',
            'total_price', 'recipient_name', 'phone', 'email', 'customer_name',
            'customer_email', 'shipping_address', 'city', 'state', 'zipcode',
            'country', 'payment_method', 'payment_status', 'razorpay_order_id',
            'razorpay_payment_id', 'carrier_name', 'tracking_number',
            'estimated_delivery', 'items', 'status_history', 'tracking_timeline',
            'created_at', 'updated_at'
        ]

    def get_customer_name(self, obj):
        if obj.recipient_name:
            return obj.recipient_name
        if obj.user:
            name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return name or obj.user.username
        return 'Customer'

    def get_customer_email(self, obj):
        return obj.email or (obj.user.email if obj.user else '')

    def get_tracking_timeline(self, obj):
        """
        Builds the standard 8-step tracking lifecycle with completed, current, and upcoming indicators and timestamps.
        """
        LIFECYCLE_STEPS = [
            ('ORDER_PLACED', 'Order Placed', 'Your order has been received.'),
            ('ORDER_CONFIRMED', 'Order Confirmed', 'Payment and order confirmed.'),
            ('PROCESSING', 'Processing', 'Items are being prepared.'),
            ('PACKED', 'Packed', 'Items packed in eco-friendly packaging.'),
            ('SHIPPED', 'Shipped', f"Handed to {obj.carrier_name or 'EcoExpress'}."),
            ('IN_TRANSIT', 'In Transit', 'Package is moving across fulfillment hubs.'),
            ('OUT_FOR_DELIVERY', 'Out for Delivery', 'Courier executive is delivering your package.'),
            ('DELIVERED', 'Delivered', 'Package safely delivered.')
        ]

        STEP_KEYS = [s[0] for s in LIFECYCLE_STEPS]
        curr_status = obj.canonical_status
        try:
            curr_idx = STEP_KEYS.index(curr_status)
        except ValueError:
            if curr_status in ['CANCELLED', 'PAYMENT_FAILED', 'REFUNDED']:
                curr_idx = -1
            else:
                curr_idx = 0

        # Build map of timestamps from history
        timestamps = {}
        if hasattr(obj, 'status_history'):
            for h in obj.status_history.all():
                canonical_to = (h.to_status or '').upper().replace(' ', '_')
                if canonical_to in ['CONFIRMED', 'PAYMENT_CONFIRMED', 'ORDER_ACCEPTED']:
                    canonical_to = 'ORDER_CONFIRMED'
                elif canonical_to in ['PENDING']:
                    canonical_to = 'ORDER_PLACED'
                timestamps[canonical_to] = h.timestamp.isoformat()
        
        # Initial creation time for order placed
        timestamps['ORDER_PLACED'] = obj.created_at.isoformat()

        if curr_status in ['CANCELLED', 'PAYMENT_FAILED', 'REFUNDED']:
            return [
                {
                    'step': 'ORDER_PLACED',
                    'title': 'Order Placed',
                    'description': 'Order was initialized.',
                    'state': 'completed',
                    'timestamp': timestamps.get('ORDER_PLACED')
                },
                {
                    'step': curr_status,
                    'title': curr_status.replace('_', ' ').title(),
                    'description': f"Order status is {curr_status.replace('_', ' ').lower()}.",
                    'state': 'cancelled',
                    'timestamp': obj.updated_at.isoformat()
                }
            ]

        timeline = []
        for idx, (step_key, step_title, step_desc) in enumerate(LIFECYCLE_STEPS):
            if idx < curr_idx:
                state = 'completed'
            elif idx == curr_idx:
                state = 'current'
            else:
                state = 'upcoming'

            timeline.append({
                'step': step_key,
                'title': step_title,
                'description': step_desc,
                'state': state,
                'timestamp': timestamps.get(step_key) if state in ['completed', 'current'] else None
            })

        return timeline


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
