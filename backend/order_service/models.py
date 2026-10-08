from django.db import models, transaction, IntegrityError
from django.contrib.auth.models import User
from django.utils import timezone
from products.models import Product, ProductVariant


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending / Placed'),
        ('order_placed', 'Order Placed'),
        ('order_confirmed', 'Order Confirmed'),
        ('payment_confirmed', 'Payment Confirmed'),
        ('order_accepted', 'Order Accepted'),
        ('processing', 'Processing'),
        ('packed', 'Packed'),
        ('ready_for_shipment', 'Ready for Shipment'),
        ('assigned_to_shipment', 'Assigned to Shipment'),
        ('shipped', 'Shipped'),
        ('in_transit', 'In Transit'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivery_verification_started', 'Delivery Verification Started'),
        ('delivery_verified', 'Delivery Verified'),
        ('delivered', 'Delivered'),
        ('cancel_requested', 'Cancel Requested'),
        ('cancelled', 'Cancelled'),
        ('payment_failed', 'Payment Failed'),
        ('return_requested', 'Return Requested'),
        ('inspection_required', 'Inspection Required'),
        ('return_approved', 'Return Approved'),
        ('return_rejected', 'Return Rejected'),
        ('return_in_transit', 'Return in Transit'),
        ('return_received', 'Return Received'),
        ('inspection_passed', 'Inspection Passed'),
        ('refund_pending', 'Refund Pending'),
        ('refund_processing', 'Refund Processing'),
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
        ('READY_FOR_SHIPMENT', 'Ready for Shipment'),
        ('ASSIGNED_TO_SHIPMENT', 'Assigned to Shipment'),
        ('SHIPPED', 'Shipped'),
        ('IN_TRANSIT', 'In Transit'),
        ('OUT_FOR_DELIVERY', 'Out for Delivery'),
        ('DELIVERY_VERIFICATION_STARTED', 'Delivery Verification Started'),
        ('DELIVERY_VERIFIED', 'Delivery Verified'),
        ('DELIVERED', 'Delivered'),
        ('CANCEL_REQUESTED', 'Cancel Requested'),
        ('CANCELLED', 'Cancelled'),
        ('PAYMENT_FAILED', 'Payment Failed'),
        ('RETURN_REQUESTED', 'Return Requested'),
        ('INSPECTION_REQUIRED', 'Inspection Required'),
        ('RETURN_APPROVED', 'Return Approved'),
        ('RETURN_REJECTED', 'Return Rejected'),
        ('RETURN_IN_TRANSIT', 'Return in Transit'),
        ('RETURN_RECEIVED', 'Return Received'),
        ('INSPECTION_PASSED', 'Inspection Passed'),
        ('REFUND_PENDING', 'Refund Pending'),
        ('REFUND_PROCESSING', 'Refund Processing'),
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
        ('REFUND_PENDING', 'Refund Pending'),
        ('REFUND_PROCESSING', 'Refund Processing'),
        ('REFUNDED', 'Refunded'),
    ]
    
    order_number = models.CharField(
        max_length=32,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text='Unique customer-facing order number (ORD-YYYYMMDD-XXXX)'
    )
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

    # Fulfillment & Logistics Attributes
    carrier_name = models.CharField(max_length=100, default='EcoExpress Carbon-Neutral', blank=True)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    estimated_delivery = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    total_weight_kg = models.DecimalField(max_digits=10, decimal_places=3, default=1.000)
    total_volume_m3 = models.DecimalField(max_digits=10, decimal_places=4, default=0.0050)
    refund_status = models.CharField(max_length=30, default='NONE')
    cancellation_reason = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Order #{self.order_reference_number} by {self.user.username}"

    @property
    def order_reference_number(self):
        return self.order_number or f"ORD-{self.id:05d}"

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
        if s == 'READY_FOR_SHIPMENT':
            return 'READY_FOR_SHIPMENT'
        if s == 'ASSIGNED_TO_SHIPMENT':
            return 'ASSIGNED_TO_SHIPMENT'
        if s == 'SHIPPED':
            return 'SHIPPED'
        if s in ['IN_TRANSIT', 'TRANSIT']:
            return 'IN_TRANSIT'
        if s == 'OUT_FOR_DELIVERY':
            return 'OUT_FOR_DELIVERY'
        if s == 'DELIVERY_VERIFICATION_STARTED':
            return 'DELIVERY_VERIFICATION_STARTED'
        if s == 'DELIVERY_VERIFIED':
            return 'DELIVERY_VERIFIED'
        if s == 'DELIVERED':
            return 'DELIVERED'
        if s in ['CANCEL_REQUESTED']:
            return 'CANCEL_REQUESTED'
        if s in ['CANCELLED', 'CANCELED']:
            return 'CANCELLED'
        if s == 'RETURN_REQUESTED':
            return 'RETURN_REQUESTED'
        if s == 'INSPECTION_REQUIRED':
            return 'INSPECTION_REQUIRED'
        if s == 'RETURN_APPROVED':
            return 'RETURN_APPROVED'
        if s == 'RETURN_REJECTED':
            return 'RETURN_REJECTED'
        if s == 'RETURN_IN_TRANSIT':
            return 'RETURN_IN_TRANSIT'
        if s == 'RETURN_RECEIVED':
            return 'RETURN_RECEIVED'
        if s == 'INSPECTION_PASSED':
            return 'INSPECTION_PASSED'
        if s == 'REFUND_PENDING':
            return 'REFUND_PENDING'
        if s == 'REFUND_PROCESSING':
            return 'REFUND_PROCESSING'
        if s == 'REFUNDED':
            return 'REFUNDED'
        return s

    def is_return_eligible(self):
        """Validates if order products are within return window and returnable."""
        if self.canonical_status != 'DELIVERED':
            return False, 'Order must be DELIVERED to request a return.'
        if not self.delivered_at:
            # Fallback to updated_at if delivered_at wasn't stamped
            delivered_time = self.updated_at
        else:
            delivered_time = self.delivered_at

        # Check order items
        has_returnable_item = False
        min_window_days = 7
        for item in self.items.all():
            if item.return_eligible:
                has_returnable_item = True
                min_window_days = item.return_window_days
                break

        if not has_returnable_item:
            return False, 'This product is not eligible for return.'

        expiry_date = delivered_time + timezone.timedelta(days=min_window_days)
        if timezone.now() > expiry_date:
            return False, f'Return window expired on {expiry_date.strftime("%d %b %Y")}.'

        if self.returns.filter(status__in=['RETURN_REQUESTED', 'INSPECTION_REQUIRED', 'RETURN_APPROVED', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED', 'REFUND_PENDING', 'REFUNDED']).exists():
            return False, 'A return request is already active or processed for this order.'

        return True, 'Return eligible'

    @classmethod
    def generate_next_order_number(cls, order_date=None):
        """
        Generates a customer-facing business order number in format:
        ORD-YYYYMMDD-XXXX
        (e.g., ORD-20261009-0001, ORD-20261009-0002)
        Uses select_for_update() inside an atomic transaction to ensure
        concurrency safety and zero sequence collisions.
        """
        if order_date is None:
            order_date = timezone.localdate() if timezone.is_aware(timezone.now()) else timezone.now().date()
        date_str = order_date.strftime('%Y%m%d')
        prefix = f"ORD-{date_str}-"

        with transaction.atomic():
            last_order = (
                cls.objects.select_for_update()
                .filter(order_number__startswith=prefix)
                .order_by('-order_number')
                .first()
            )
            if last_order and last_order.order_number:
                try:
                    last_seq = int(last_order.order_number.split('-')[-1])
                    next_seq = last_seq + 1
                except (ValueError, IndexError):
                    next_seq = 1
            else:
                next_seq = 1

            candidate = f"{prefix}{next_seq:04d}"
            while cls.objects.filter(order_number=candidate).exists():
                next_seq += 1
                candidate = f"{prefix}{next_seq:04d}"

            return candidate

    def save(self, *args, **kwargs):
        if not self.recipient_name and self.user:
            self.recipient_name = f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
        if not self.email and self.user:
            self.email = self.user.email
        if not self.estimated_delivery:
            # Default estimated delivery: 4 days from creation
            self.estimated_delivery = timezone.now() + timezone.timedelta(days=4)
        if self.status in ['DELIVERED', 'delivered'] and not self.delivered_at:
            self.delivered_at = timezone.now()

        is_new = self.pk is None
        if not self.order_number:
            order_date = timezone.localdate() if timezone.is_aware(timezone.now()) else timezone.now().date()
            for attempt in range(10):
                self.order_number = self.generate_next_order_number(order_date)
                try:
                    sid = transaction.savepoint()
                    super().save(*args, **kwargs)
                    transaction.savepoint_commit(sid)
                    break
                except IntegrityError as exc:
                    transaction.savepoint_rollback(sid)
                    if 'order_number' in str(exc) or 'Duplicate entry' in str(exc):
                        self.order_number = None
                        if attempt == 9:
                            raise
                        continue
                    raise
        else:
            super().save(*args, **kwargs)

        if is_new and not self.tracking_number and self.id:
            self.tracking_number = f"ECO-AWB-{self.id + 100000}"
            super().save(update_fields=['tracking_number'])
    
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
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_items')
    variant_name = models.CharField(max_length=100, blank=True, default='')
    product_name = models.CharField(max_length=255, blank=True, default='')
    quantity = models.IntegerField()
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Snapshot product policy & logistics dimensions at purchase time
    return_eligible = models.BooleanField(default=True)
    return_window_days = models.IntegerField(default=7)
    return_policy = models.TextField(blank=True, default='7-day replacement or return')
    condition_required = models.TextField(blank=True, default='Unused, original packaging and tags intact')
    weight_kg = models.DecimalField(max_digits=10, decimal_places=3, default=1.000)
    volume_m3 = models.DecimalField(max_digits=10, decimal_places=4, default=0.0050)
    
    def __str__(self):
        pname = self.product.name if self.product else (self.product_name or 'Product')
        return f"{pname} x {self.quantity} in Order #{self.order.id}"
    
    def get_subtotal(self):
        return self.price_at_purchase * self.quantity

    def get_total_weight(self):
        return self.weight_kg * self.quantity

    def get_total_volume(self):
        return self.volume_m3 * self.quantity


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
    trigger_event = models.CharField(max_length=50)  # ORDER_ACCEPTED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURN_REQUESTED, REFUND_SUCCESS
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
        ('OPEN', 'Open for Assignment'),
        ('FULL', 'Full'),
        ('READY_FOR_DISPATCH', 'Ready for Dispatch'),
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
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    container = models.ForeignKey(Container, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='OPEN')
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
    dispatched_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    # Capacity constraints & telemetry
    max_weight_kg = models.DecimalField(max_digits=10, decimal_places=2, default=10000.00)
    max_volume_m3 = models.DecimalField(max_digits=10, decimal_places=2, default=35.00)
    used_weight_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    used_volume_m3 = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status'], name='idx_shipment_status'),
            models.Index(fields=['container'], name='idx_shipment_container_id'),
            models.Index(fields=['tracking_number'], name='idx_shipment_track_num'),
            models.Index(fields=['destination'], name='idx_shipment_destination'),
            models.Index(fields=['last_location_update'], name='idx_shipment_last_loc_upd'),
        ]

    def __str__(self):
        return f"Shipment #{self.shipment_number} ({self.status}) [{self.used_weight_kg}/{self.max_weight_kg}kg]"

    def can_accept_orders(self):
        return self.status in ['OPEN', 'CREATED']

    def remaining_weight(self):
        return max(0, float(self.max_weight_kg) - float(self.used_weight_kg))

    def remaining_volume(self):
        return max(0, float(self.max_volume_m3) - float(self.used_volume_m3))


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


# ============================================================================
# Return Management & Auditing Domain Models
# ============================================================================

class OrderReturn(models.Model):
    RETURN_STATUS_CHOICES = [
        ('RETURN_REQUESTED', 'Return Requested'),
        ('INSPECTION_REQUIRED', 'Inspection Required'),
        ('RETURN_APPROVED', 'Return Approved'),
        ('RETURN_REJECTED', 'Return Rejected'),
        ('RETURN_IN_TRANSIT', 'Return in Transit'),
        ('RETURN_RECEIVED', 'Return Received at Warehouse'),
        ('INSPECTION_PASSED', 'Inspection Passed'),
        ('REFUND_PENDING', 'Refund Pending'),
        ('REFUND_PROCESSING', 'Refund Processing'),
        ('REFUNDED', 'Refunded'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='returns')
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, null=True, blank=True, related_name='returns')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='returns')
    reason = models.CharField(max_length=255)
    condition_note = models.TextField(blank=True, default='')
    status = models.CharField(max_length=50, choices=RETURN_STATUS_CHOICES, default='RETURN_REQUESTED')
    rejection_reason = models.TextField(blank=True, default='')
    refund_id = models.CharField(max_length=100, blank=True, default='')
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    requested_at = models.DateTimeField(auto_now_add=True)
    inspected_at = models.DateTimeField(null=True, blank=True)
    inspected_by = models.CharField(max_length=100, blank=True, default='')
    received_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order'], name='idx_return_order_id'),
            models.Index(fields=['status'], name='idx_return_status'),
            models.Index(fields=['user'], name='idx_return_user_id'),
        ]

    def __str__(self):
        return f"Return #{self.id} for Order #{self.order_id} ({self.status})"


class DeliveryVerificationAudit(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='delivery_audits')
    shipment_id = models.BigIntegerField(null=True, blank=True)
    verified_by = models.CharField(max_length=100, default='CUSTOMER_OTP')
    customer_id = models.BigIntegerField(null=True, blank=True)
    verification_method = models.CharField(max_length=50, default='CUSTOMER_OTP')
    timestamp = models.DateTimeField(auto_now_add=True)
    previous_status = models.CharField(max_length=50, blank=True, default='')
    new_status = models.CharField(max_length=50, default='DELIVERED')
    delivery_notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['order'], name='idx_deliv_audit_ord_id'),
            models.Index(fields=['shipment_id'], name='idx_deliv_audit_shp_id'),
            models.Index(fields=['timestamp'], name='idx_deliv_audit_time'),
        ]

    def __str__(self):
        return f"DeliveryAudit: Order #{self.order_id} verified by {self.verified_by} at {self.timestamp}"


class RouteExceptionAudit(models.Model):
    shipment_id = models.BigIntegerField()
    order_id = models.BigIntegerField()
    actor_username = models.CharField(max_length=100)
    actor_role = models.CharField(max_length=100)
    expected_route = models.CharField(max_length=255)
    actual_shipment_route = models.CharField(max_length=255)
    exception_reason = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['shipment_id'], name='idx_route_exc_shp_id'),
            models.Index(fields=['order_id'], name='idx_route_exc_ord_id'),
            models.Index(fields=['timestamp'], name='idx_route_exc_time'),
        ]

    def __str__(self):
        return f"RouteExceptionAudit: Order #{self.order_id} -> Shipment #{self.shipment_id} by {self.actor_username} ({self.exception_reason})"


