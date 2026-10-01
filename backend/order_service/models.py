from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from products.models import Product


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending / Placed'),
        ('order_placed', 'Order Placed'),
        ('order_confirmed', 'Order Confirmed'),
        ('payment_confirmed', 'Payment Confirmed'),
        ('order_accepted', 'Order Accepted'),
        ('processing', 'Processing'),
        ('packed', 'Packed'),
        ('shipped', 'Shipped'),
        ('in_transit', 'In Transit'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('payment_failed', 'Payment Failed'),
        ('refunded', 'Refunded'),
        ('confirmed', 'Confirmed'),
        # Uppercase aliases for compatibility
        ('PENDING', 'Pending / Placed'),
        ('ORDER_PLACED', 'Order Placed'),
        ('ORDER_CONFIRMED', 'Order Confirmed'),
        ('PAYMENT_CONFIRMED', 'Payment Confirmed'),
        ('ORDER_ACCEPTED', 'Order Accepted'),
        ('PROCESSING', 'Processing'),
        ('PACKED', 'Packed'),
        ('SHIPPED', 'Shipped'),
        ('IN_TRANSIT', 'In Transit'),
        ('OUT_FOR_DELIVERY', 'Out for Delivery'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
        ('PAYMENT_FAILED', 'Payment Failed'),
        ('REFUNDED', 'Refunded'),
        ('CONFIRMED', 'Confirmed'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('cod', 'Cash on Delivery'),
        ('razorpay', 'Razorpay / UPI'),
        ('upi', 'UPI Direct'),
        ('card', 'Credit / Debit Card'),
        ('netbanking', 'Net Banking'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('VERIFIED', 'Verified'),
        ('PAID', 'Paid'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default='ORDER_PLACED')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Recipient & contact information
    recipient_name = models.CharField(max_length=150, blank=True, default='')
    phone = models.CharField(max_length=30, blank=True, default='')
    email = models.EmailField(blank=True, default='')

    # Shipping details
    shipping_address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zipcode = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='India')

    # Payment details
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='cod')
    payment_status = models.CharField(max_length=30, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)

    # Fulfillment & Tracking
    carrier_name = models.CharField(max_length=100, default='EcoExpress Carbon-Neutral', blank=True)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    estimated_delivery = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Order #{self.order_reference_number} by {self.user.username}"

    @property
    def order_reference_number(self):
        return f"ORD-{self.id:05d}"

    @property
    def canonical_status(self):
        """Standardize status to uppercase canonical format."""
        s = (self.status or '').upper().replace(' ', '_')
        if s in ['PENDING', 'ORDER_PLACED']:
            return 'ORDER_PLACED'
        if s in ['CONFIRMED', 'PAYMENT_CONFIRMED', 'ORDER_ACCEPTED', 'ORDER_CONFIRMED']:
            return 'ORDER_CONFIRMED'
        if s == 'PROCESSING':
            return 'PROCESSING'
        if s == 'PACKED':
            return 'PACKED'
        if s == 'SHIPPED':
            return 'SHIPPED'
        if s in ['IN_TRANSIT', 'TRANSIT']:
            return 'IN_TRANSIT'
        if s == 'OUT_FOR_DELIVERY':
            return 'OUT_FOR_DELIVERY'
        if s == 'DELIVERED':
            return 'DELIVERED'
        if s in ['CANCELLED', 'CANCELED']:
            return 'CANCELLED'
        return s

    def save(self, *args, **kwargs):
        if not self.recipient_name and self.user:
            self.recipient_name = f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
        if not self.email and self.user:
            self.email = self.user.email
        if not self.tracking_number and self.id:
            self.tracking_number = f"ECO-AWB-{self.id + 100000}"
        if not self.estimated_delivery:
            # Default estimated delivery: 4 days from creation
            self.estimated_delivery = timezone.now() + timezone.timedelta(days=4)
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='idx_order_user_id'),
            models.Index(fields=['status'], name='idx_order_status'),
            models.Index(fields=['payment_status'], name='idx_order_payment_status'),
        ]


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_items')
    product_name = models.CharField(max_length=255, blank=True, default='')
    quantity = models.IntegerField()
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        pname = self.product.name if self.product else (self.product_name or 'Product')
        return f"{pname} x {self.quantity} in Order #{self.order.id}"
    
    def get_subtotal(self):
        return self.price_at_purchase * self.quantity


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=50, blank=True, default='')
    to_status = models.CharField(max_length=50)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    changed_by_name = models.CharField(max_length=100, default='System')
    note = models.TextField(blank=True, default='')
    carrier_name = models.CharField(max_length=100, blank=True, default='')
    tracking_number = models.CharField(max_length=100, blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"Order #{self.order.id}: {self.from_status} -> {self.to_status} at {self.timestamp}"


class NotificationLog(models.Model):
    NOTIFICATION_TYPES = [
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
        ('IN_APP', 'In-App Notification'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='order_notifications', null=True, blank=True)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='EMAIL')
    recipient = models.CharField(max_length=150)
    subject = models.CharField(max_length=255, blank=True, default='')
    message = models.TextField()
    status = models.CharField(max_length=30, default='SENT')  # SENT, SIMULATED, FAILED
    trigger_event = models.CharField(max_length=50)  # ORDER_ACCEPTED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.trigger_event} to {self.recipient} at {self.created_at}"


# ============================================================================
# Logistics & Fulfillment Domain Models (Shipment, Container, Tracking)
# ============================================================================

class Container(models.Model):
    STATUS_CHOICES = [
        ('CREATED', 'Created'),
        ('PACKED', 'Packed'),
        ('DISPATCHED', 'Dispatched'),
        ('IN_TRANSIT', 'In Transit'),
        ('ARRIVED_AT_HUB', 'Arrived at Hub'),
        ('CLOSED', 'Closed'),
    ]

    container_code = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='CREATED')
    origin = models.CharField(max_length=128)
    destination = models.CharField(max_length=128)
    route = models.CharField(max_length=255, blank=True, default='')
    current_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status'], name='idx_container_status'),
            models.Index(fields=['destination'], name='idx_container_destination'),
            models.Index(fields=['last_location_update'], name='idx_container_last_loc_upd'),
            models.Index(fields=['container_code'], name='idx_container_code'),
        ]

    def __str__(self):
        return f"Container [{self.container_code}] ({self.status}) -> {self.destination}"


class Shipment(models.Model):
    STATUS_CHOICES = [
        ('CREATED', 'Created'),
        ('PACKED', 'Packed'),
        ('DISPATCHED', 'Dispatched'),
        ('IN_TRANSIT', 'In Transit'),
        ('ARRIVED_AT_HUB', 'Arrived at Hub'),
        ('OUT_FOR_DELIVERY', 'Out for Delivery'),
        ('DELIVERED', 'Delivered'),
        ('FAILED_DELIVERY', 'Failed Delivery'),
        ('CANCELLED', 'Cancelled'),
        ('RETURNED', 'Returned'),
    ]

    shipment_number = models.CharField(max_length=64, unique=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='shipments')
    container = models.ForeignKey(Container, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='CREATED')
    carrier_name = models.CharField(max_length=100, blank=True, default='EcoExpress Carbon-Neutral')
    tracking_number = models.CharField(max_length=100, blank=True, default='')
    vehicle_number = models.CharField(max_length=64, blank=True, default='')
    origin = models.CharField(max_length=128, blank=True, default='')
    destination = models.CharField(max_length=128, blank=True, default='')
    route = models.CharField(max_length=255, blank=True, default='')
    current_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)
    estimated_delivery = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order'], name='idx_shipment_order_id'),
            models.Index(fields=['status'], name='idx_shipment_status'),
            models.Index(fields=['container'], name='idx_shipment_container_id'),
            models.Index(fields=['tracking_number'], name='idx_shipment_track_num'),
            models.Index(fields=['destination'], name='idx_shipment_destination'),
            models.Index(fields=['last_location_update'], name='idx_shipment_last_loc_upd'),
        ]

    def __str__(self):
        return f"Shipment #{self.shipment_number} for Order #{self.order_id} ({self.status})"


class ShipmentItem(models.Model):
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='items')
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name='shipment_allocations')
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['order_item'], name='idx_shp_item_ord_item_id'),
            models.Index(fields=['shipment'], name='idx_shp_item_shipment_id'),
        ]

    def __str__(self):
        return f"{self.quantity} of OrderItem #{self.order_item_id} in Shipment #{self.shipment.shipment_number}"


class LogisticsTrackingEvent(models.Model):
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, null=True, blank=True, related_name='tracking_events')
    container = models.ForeignKey(Container, on_delete=models.CASCADE, null=True, blank=True, related_name='tracking_events')
    status = models.CharField(max_length=50)
    location_name = models.CharField(max_length=128, blank=True, default='')
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    description = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['shipment'], name='idx_tracking_shipment_id'),
            models.Index(fields=['container'], name='idx_tracking_container_id'),
            models.Index(fields=['timestamp'], name='idx_tracking_created_at'),
        ]

    def __str__(self):
        target = f"Shipment #{self.shipment_id}" if self.shipment_id else f"Container #{self.container_id}"
        return f"[{self.status}] {target} at {self.location_name} ({self.timestamp})"


class ShipmentEvent(models.Model):
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='events')
    old_status = models.CharField(max_length=50, blank=True, default='')
    new_status = models.CharField(max_length=50)
    changed_by = models.CharField(max_length=100, blank=True, default='System')
    changed_role = models.CharField(max_length=100, blank=True, default='Warehouse Staff')
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'shipment_events'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['shipment'], name='idx_shpevt_shipment_id'),
            models.Index(fields=['created_at'], name='idx_shpevt_created_at'),
        ]

    def __str__(self):
        return f"Shipment #{self.shipment_id}: {self.old_status} -> {self.new_status} by {self.changed_by} ({self.changed_role}) at {self.created_at}"

