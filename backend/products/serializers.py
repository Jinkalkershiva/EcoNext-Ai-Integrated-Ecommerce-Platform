from rest_framework import serializers

from products.models import (
    Product, Category, PriceHistory, ProductSearch,
    SubCategory, AgeGroup, GenderCategory, EcoTag, SkinOrBodyFit, Season, Occasion,
    ProductVariant, ProductReview, ReviewImage, ProductInquiry
)
from accounts.models import UserProfile, ActivityLog, UserAddress
from shop_cart.models import Cart, CartItem
from order_service.models import Order, OrderItem, OrderStatusHistory, NotificationLog, Shipment, ShipmentItem, ShipmentEvent
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


class ProductVariantSerializer(serializers.ModelSerializer):
    price = serializers.SerializerMethodField()
    original_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'color', 'sku', 'price', 'original_price', 'stock', 'is_active']

    def get_price(self, obj):
        return str(obj.get_price())


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    subcategory = SubCategorySerializer(read_only=True)
    age_groups = AgeGroupSerializer(many=True, read_only=True)
    gender_categories = GenderCategorySerializer(many=True, read_only=True)
    eco_tags = EcoTagSerializer(many=True, read_only=True)
    skin_or_body_fit = SkinOrBodyFitSerializer(read_only=True)
    season = SeasonSerializer(read_only=True)
    occasion = OccasionSerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

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
    is_whitelisted = serializers.BooleanField(read_only=True)
    isWhitelisted = serializers.BooleanField(source='is_whitelisted', read_only=True)
    is_archived = serializers.SerializerMethodField()
    isArchived = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    ratings_count = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'subcategory', 'current_price',
            'price', 'stock', 'stockQuantity', 'sku', 'categoryId', 'categoryName',
            'image_url', 'imageUrl', 'additional_images', 'additionalImages', 'tags',
            'is_whitelisted', 'isWhitelisted', 'is_archived', 'isArchived', 'status',
            'created_at', 'age_groups', 'gender_categories', 'eco_tags', 'skin_or_body_fit',
            'season', 'occasion', 'popularity_score', 'sustainability_score', 'sustainabilityScore',
            'variants', 'rating', 'ratings_count', 'reviews_count'
        ]

    def get_rating(self, obj):
        reviews = obj.reviews.all()
        if reviews.exists():
            from django.db.models import Avg
            avg = reviews.aggregate(Avg('rating'))['rating__avg']
            return round(float(avg), 1) if avg is not None else 0.0
        return 0.0

    def get_reviews_count(self, obj):
        return obj.reviews.count()

    def get_ratings_count(self, obj):
        return obj.reviews.count()

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

    def get_is_archived(self, obj):
        return (obj.status or '').upper() == 'ARCHIVED'

    def get_isArchived(self, obj):
        return self.get_is_archived(obj)

    def get_status(self, obj):
        st = (obj.status or 'ACTIVE').upper()
        if st == 'ARCHIVED':
            return 'ARCHIVED'
        if obj.stock <= 0:
            return 'OUT_OF_STOCK'
        elif obj.stock <= 10:
            return 'LOW_STOCK'
        return st


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
    variant = ProductVariantSerializer(read_only=True)
    variant_id = serializers.IntegerField(read_only=True)
    subtotal = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    
    class Meta:
        model = CartItem
        fields = ['id', 'product', 'variant', 'variant_id', 'price', 'quantity', 'subtotal', 'added_at']
    
    def get_price(self, obj):
        return str(obj.get_price())

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
    product = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    variant = ProductVariantSerializer(read_only=True)
    variant_name = serializers.CharField(read_only=True)
    subtotal = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'variant', 'variant_name', 'quantity', 'price_at_purchase',
            'subtotal', 'return_eligible', 'return_window_days', 'return_policy',
            'condition_required', 'weight_kg', 'volume_m3'
        ]
    
    def get_product(self, obj):
        if obj.product:
            return ProductSerializer(obj.product).data
        return {
            'id': None,
            'name': obj.product_name or 'Purchased Item',
            'image_url': None,
            'imageUrl': None,
            'price': str(obj.price_at_purchase),
            'current_price': str(obj.price_at_purchase),
            'status': 'ARCHIVED'
        }

    def get_product_name(self, obj):
        return obj.product.name if obj.product else (obj.product_name or 'Purchased Item')

    def get_subtotal(self, obj):
        return str(obj.get_subtotal())


class ReviewImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ReviewImage
        fields = ['id', 'url', 'created_at']

    def get_url(self, obj):
        return obj.get_url()


class ProductReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_initial = serializers.SerializerMethodField()
    images = ReviewImageSerializer(many=True, read_only=True)

    class Meta:
        model = ProductReview
        fields = [
            'id', 'product', 'user', 'user_name', 'user_initial',
            'rating', 'title', 'comment', 'is_verified_purchase',
            'helpful_votes', 'images', 'created_at'
        ]
        read_only_fields = ['user', 'is_verified_purchase', 'helpful_votes', 'created_at']

    def get_user_name(self, obj):
        if not obj.user:
            return 'Verified Customer'
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        if full_name:
            return full_name
        return obj.user.username

    def get_user_initial(self, obj):
        name = self.get_user_name(obj)
        return name[0].upper() if name else 'U'


class UserAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAddress
        fields = [
            'id', 'address_type', 'full_name', 'phone', 'address_line',
            'landmark', 'city', 'state', 'zipcode', 'country', 'is_default',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']



class OrderReturnSerializer(serializers.ModelSerializer):
    class Meta:
        from order_service.models import OrderReturn
        model = OrderReturn
        fields = [
            'id', 'order', 'order_item', 'user', 'reason', 'condition_note',
            'status', 'rejection_reason', 'refund_id', 'refund_amount',
            'requested_at', 'inspected_at', 'inspected_by', 'received_at',
            'created_at', 'updated_at'
        ]


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ['id', 'from_status', 'to_status', 'changed_by_name', 'note', 'carrier_name', 'tracking_number', 'timestamp']


class ShipmentEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentEvent
        fields = ['id', 'shipment_id', 'old_status', 'new_status', 'changed_by', 'changed_role', 'latitude', 'longitude', 'created_at']


class ShipmentSerializer(serializers.ModelSerializer):
    events = ShipmentEventSerializer(many=True, read_only=True)

    class Meta:
        model = Shipment
        fields = [
            'id', 'shipment_number', 'order_id', 'status', 'carrier_name',
            'tracking_number', 'vehicle_number', 'origin', 'destination', 'route',
            'max_weight_kg', 'max_volume_m3', 'used_weight_kg', 'used_volume_m3',
            'current_latitude', 'current_longitude', 'last_location_update',
            'estimated_delivery', 'dispatched_at', 'delivered_at', 'events', 'created_at', 'updated_at'
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    shipments = ShipmentSerializer(many=True, read_only=True)
    returns = OrderReturnSerializer(many=True, read_only=True)
    order_number = serializers.CharField(read_only=True)
    order_reference_number = serializers.CharField(read_only=True)
    canonical_status = serializers.CharField(read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    shipment_id = serializers.SerializerMethodField()
    shipment_number = serializers.SerializerMethodField()
    shipment_status = serializers.SerializerMethodField()
    current_latitude = serializers.SerializerMethodField()
    current_longitude = serializers.SerializerMethodField()
    vehicle_number = serializers.SerializerMethodField()
    origin = serializers.SerializerMethodField()
    destination = serializers.SerializerMethodField()
    route = serializers.SerializerMethodField()
    tracking_timeline = serializers.SerializerMethodField()
    return_eligibility = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'order_number', 'order_reference_number', 'status', 'canonical_status',
            'total_price', 'recipient_name', 'phone', 'email', 'customer_name',
            'customer_email', 'shipping_address', 'city', 'state', 'zipcode',
            'country', 'payment_method', 'payment_status', 'razorpay_order_id',
            'razorpay_payment_id', 'carrier_name', 'tracking_number',
            'estimated_delivery', 'delivered_at', 'total_weight_kg', 'total_volume_m3',
            'refund_status', 'cancellation_reason', 'return_eligibility',
            'shipment_id', 'shipment_number', 'shipment_status',
            'current_latitude', 'current_longitude', 'vehicle_number',
            'origin', 'destination', 'route',
            'shipments', 'items', 'status_history', 'returns', 'tracking_timeline',
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

    def get_shipment_id(self, obj):
        first_shp = obj.shipments.first() if hasattr(obj, 'shipments') else None
        return first_shp.id if first_shp else None

    def get_shipment_number(self, obj):
        first_shp = obj.shipments.first() if hasattr(obj, 'shipments') else None
        if first_shp:
            return first_shp.shipment_number
        if obj.tracking_number and obj.canonical_status in ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']:
            return f"SHP-{obj.id:05d}"
        return None

    def get_shipment_status(self, obj):
        first_shp = obj.shipments.first() if hasattr(obj, 'shipments') else None
        if first_shp:
            return first_shp.status
        canonical = obj.canonical_status
        if canonical == 'DELIVERED':
            return 'DELIVERED'
        elif canonical in ['OUT_FOR_DELIVERY', 'DELIVERY_VERIFICATION_STARTED', 'DELIVERY_VERIFIED']:
            return 'OUT_FOR_DELIVERY'
        elif canonical in ['SHIPPED', 'IN_TRANSIT']:
            return 'IN_TRANSIT'
        elif canonical in ['PACKED', 'READY_FOR_SHIPMENT', 'ASSIGNED_TO_SHIPMENT']:
            return 'READY_FOR_DISPATCH'
        return None

    def get_current_latitude(self, obj):
        first_shp = obj.shipments.first() if hasattr(obj, 'shipments') else None
        return float(first_shp.current_latitude) if (first_shp and first_shp.current_latitude is not None) else None

    def get_current_longitude(self, obj):
        first_shp = obj.shipments.first() if hasattr(obj, 'shipments') else None
        return float(first_shp.current_longitude) if (first_shp and first_shp.current_longitude is not None) else None

    def get_vehicle_number(self, obj):
        first_shp = obj.shipments.first() if hasattr(obj, 'shipments') else None
        return first_shp.vehicle_number if (first_shp and first_shp.vehicle_number) else ''

    def get_origin(self, obj):
        first_shp = obj.shipments.first() if hasattr(obj, 'shipments') else None
        return first_shp.origin if (first_shp and first_shp.origin) else ''

    def get_destination(self, obj):
        first_shp = obj.shipments.first() if hasattr(obj, 'shipments') else None
        if first_shp and first_shp.destination:
            return first_shp.destination
        return f"{obj.city}, {obj.state}".strip(', ')

    def get_route(self, obj):
        first_shp = obj.shipments.first() if hasattr(obj, 'shipments') else None
        return first_shp.route if (first_shp and first_shp.route) else ''

    def get_return_eligibility(self, obj):
        eligible, reason = obj.is_return_eligible()
        # Calculate expiry date if applicable
        expiry_iso = None
        if obj.status in ['DELIVERED', 'delivered'] or obj.delivered_at:
            deliv = obj.delivered_at or obj.updated_at
            min_days = 7
            for item in obj.items.all():
                if item.return_eligible:
                    min_days = item.return_window_days
                    break
            if deliv:
                try:
                    from django.utils import timezone
                    expiry_dt = deliv + timezone.timedelta(days=min_days)
                    expiry_iso = expiry_dt.isoformat()
                except Exception:
                    pass

        return {
            'eligible': eligible,
            'reason': reason,
            'returnWindowExpiry': expiry_iso,
            'hasActiveReturn': obj.returns.filter(status__in=['RETURN_REQUESTED', 'INSPECTION_REQUIRED', 'RETURN_APPROVED', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED', 'REFUND_PENDING', 'REFUNDED']).exists() if hasattr(obj, 'returns') else False
        }

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


class ProductInquirySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductInquiry
        fields = ['id', 'product', 'user', 'user_name', 'sender_type', 'message', 'is_read', 'created_at']
        read_only_fields = ['user', 'created_at']

    def get_user_name(self, obj):
        if not obj.user:
            return 'Guest'
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username

