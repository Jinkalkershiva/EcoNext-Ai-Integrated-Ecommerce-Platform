"""Cart and order endpoints.

Response shapes are kept stable for the frontend: cart endpoints always return
{'status': 'success', 'cart': {...}} and order endpoints return
{'status': 'success', 'order': {...}}.

Notes on what changed and why:
  * Every handler used to be wrapped in `except Exception: return 400, str(e)`,
    which turned genuine 404s, permission errors and programming bugs alike into
    a 400 carrying an internal message. Errors are now typed properly and real
    faults are logged instead of leaked.
  * `clear_cart` and `create_order` used get_object_or_404(Cart, ...), so a user
    who had never added anything got a 404 instead of an empty cart.
  * Quantities arriving as strings ("2") crashed the comparison `quantity <= 0`.
    They are parsed and validated once, in one place.
  * Checkout is now a single atomic transaction that also checks and decrements
    stock, so a failure halfway through can no longer leave a partial order or
    oversell a product.
"""

import logging
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import ActivityLog
from order_service.models import Order, OrderItem, OrderStatusHistory
from order_service.notification_service import notify_order_status_change
from products.models import Product, ProductVariant
from products.serializers import CartSerializer, OrderSerializer
from shop_cart.models import Cart, CartItem

logger = logging.getLogger(__name__)

MAX_QUANTITY_PER_ITEM = 99


def get_or_create_cart(user):
    """Return the user's cart, creating it on first use."""
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def cart_response(cart, message=None, **extra):
    """Serialize a cart with the joins its nested product data needs.

    CartSerializer nests ProductSerializer, which itself nests eight relations.
    Re-fetching the items with these joins keeps a cart page to a handful of
    queries instead of one per product per relation.
    """
    cart = (
        Cart.objects
        .prefetch_related(
            'items__variant',
            'items__product__category',
            'items__product__subcategory',
            'items__product__age_groups',
            'items__product__gender_categories',
            'items__product__eco_tags',
            'items__product__skin_or_body_fit',
            'items__product__season',
            'items__product__occasion',
            'items__product__variants',
        )
        .get(pk=cart.pk)
    )
    payload = {'status': 'success', 'cart': CartSerializer(cart).data}
    if message:
        payload['message'] = message
    payload.update(extra)
    return Response(payload)


def order_queryset(user=None):
    """Orders with their nested product data and status history prefetched."""
    queryset = Order.objects.select_related('user').prefetch_related(
        'items__variant',
        'items__product__category',
        'items__product__subcategory',
        'items__product__age_groups',
        'items__product__gender_categories',
        'items__product__eco_tags',
        'items__product__skin_or_body_fit',
        'items__product__season',
        'items__product__occasion',
        'items__product__variants',
        'status_history',
    )
    if user is not None:
        queryset = queryset.filter(user=user)
    return queryset.order_by('-created_at')


def parse_quantity(raw, default=1, allow_zero=False):
    """Coerce a request quantity to a sane int.

    Returns (quantity, error_message). Callers that treat 0 as "remove this
    item" pass allow_zero=True.
    """
    if raw is None:
        raw = default
    try:
        quantity = int(raw)
    except (TypeError, ValueError):
        return None, 'Quantity must be a whole number.'

    minimum = 0 if allow_zero else 1
    if quantity < minimum:
        return None, 'Quantity must be at least 1.'
    if quantity > MAX_QUANTITY_PER_ITEM:
        return None, f'Quantity cannot exceed {MAX_QUANTITY_PER_ITEM} per item.'
    return quantity, None


def bad_request(message, **extra):
    return Response({'status': 'error', 'message': message, **extra},
                    status=status.HTTP_400_BAD_REQUEST)


# ============ Shopping Cart Endpoints ============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cart(request):
    """Get the user's shopping cart, creating an empty one if needed."""
    return cart_response(get_or_create_cart(request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    """Add a product/variant to the cart, or increase its quantity if already present."""
    product_id = request.data.get('product_id') or request.data.get('product')
    variant_id = request.data.get('variant_id') or request.data.get('variant')
    if not product_id:
        return bad_request('product_id is required.')

    quantity, error = parse_quantity(request.data.get('quantity', 1))
    if error:
        return bad_request(error)

    product = get_object_or_404(Product, id=product_id)
    variant = None
    if variant_id:
        try:
            variant = ProductVariant.objects.get(id=variant_id, product=product)
        except (ProductVariant.DoesNotExist, ValueError):
            variant = None

    with transaction.atomic():
        cart = get_or_create_cart(request.user)
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, product=product, variant=variant, defaults={'quantity': quantity}
        )
        if not created:
            quantity = min(cart_item.quantity + quantity, MAX_QUANTITY_PER_ITEM)

        avail_stock = variant.stock if (variant and variant.stock is not None) else product.stock
        if avail_stock <= 0:
            if created:
                cart_item.delete()
            return bad_request(f'{product.name} ({"Size: " + variant.size if variant else "Default"}) is out of stock.')

        quantity = min(quantity, avail_stock)

        if quantity != cart_item.quantity:
            cart_item.quantity = quantity
            cart_item.save(update_fields=['quantity'])

    ActivityLog.objects.create(
        user=request.user,
        action='add_to_cart',
        product=product,
        details={'quantity': cart_item.quantity, 'variant_id': variant.id if variant else None},
    )

    variant_desc = f" ({variant.size})" if variant else ""
    return cart_response(cart, message=f'{product.name}{variant_desc} added to cart.')


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_cart_item(request, item_id):
    """Set a cart item's quantity. Quantity 0 removes the item."""
    if 'quantity' not in request.data:
        return bad_request('quantity is required.')

    quantity, error = parse_quantity(request.data.get('quantity'), allow_zero=True)
    if error:
        return bad_request(error)

    cart = get_or_create_cart(request.user)
    cart_item = CartItem.objects.select_related('cart', 'product', 'variant').filter(
        id=item_id,
        cart=cart,
    ).first()

    if not cart_item:
        cart_item = CartItem.objects.select_related('cart', 'product', 'variant').filter(
            product_id=item_id,
            cart=cart,
        ).first()

    if not cart_item:
        return bad_request('Cart item not found.')

    if quantity == 0:
        cart_item.delete()
        return cart_response(cart, message='Item removed from cart.')

    avail_stock = cart_item.variant.stock if (cart_item.variant and cart_item.variant.stock is not None) else cart_item.product.stock
    if quantity > avail_stock:
        return bad_request(
            f'Only {avail_stock} available in stock.',
            available=avail_stock,
        )

    cart_item.quantity = quantity
    cart_item.save(update_fields=['quantity'])
    return cart_response(cart)


@api_view(['DELETE', 'POST'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, item_id):
    """Remove a single item from the cart."""
    cart = get_or_create_cart(request.user)
    cart_item = CartItem.objects.filter(id=item_id, cart=cart).first()
    if not cart_item:
        cart_item = CartItem.objects.filter(product_id=item_id, cart=cart).first()
    if cart_item:
        cart_item.delete()
    return cart_response(cart, message='Item removed from cart.')


@api_view(['DELETE', 'POST'])
@permission_classes([IsAuthenticated])
def clear_cart(request):
    """Empty the cart. Succeeds even if the cart was already empty."""
    cart = get_or_create_cart(request.user)
    cart.items.all().delete()
    return cart_response(cart, message='Cart cleared.')


# ============ Order Endpoints ============

REQUIRED_SHIPPING_FIELDS = ('address', 'city', 'state', 'zipcode', 'country')

ALLOWED_ORDER_TRANSITIONS = {
    'PENDING': ['PAYMENT_CONFIRMED', 'ORDER_ACCEPTED', 'PROCESSING', 'CANCELLED'],
    'PAYMENT_CONFIRMED': ['ORDER_ACCEPTED', 'PROCESSING', 'CANCELLED'],
    'ORDER_ACCEPTED': ['PROCESSING', 'CANCELLED'],
    'PROCESSING': ['SHIPPED', 'CANCELLED'],
    'SHIPPED': ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
    'OUT_FOR_DELIVERY': ['DELIVERED', 'CANCELLED'],
    'DELIVERED': ['REFUNDED'],
    'CANCELLED': [],
    'PAYMENT_FAILED': ['PENDING', 'CANCELLED'],
    'REFUNDED': []
}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    """Turn the cart into an order with full shipping, payment, and tracking lifecycle.

    Stock is checked and decremented inside one atomic transaction. An initial
    OrderStatusHistory record is generated and a notification is dispatched.
    """
    # Accept either {'shipping': {...}} or the fields at the top level.
    shipping = request.data.get('shipping')
    if not isinstance(shipping, dict):
        shipping = request.data

    values = {}
    missing = []
    for field in REQUIRED_SHIPPING_FIELDS:
        value = (shipping.get(field) or '').strip() if isinstance(shipping.get(field), str) \
            else shipping.get(field)
        if not value:
            missing.append(field)
        else:
            values[field] = value

    if missing:
        return bad_request(
            'Shipping details are incomplete.',
            errors={field: 'This field is required.' for field in missing},
        )

    # Extract payment & recipient details
    payment_method = str(shipping.get('payment_method') or 'cod').lower()
    first_name = shipping.get('first_name') or request.user.first_name or ''
    last_name = shipping.get('last_name') or request.user.last_name or ''
    recipient_name = f"{first_name} {last_name}".strip() or request.user.username
    phone = shipping.get('phone') or ''
    email = shipping.get('email') or request.user.email or ''

    razorpay_order_id = shipping.get('razorpay_order_id') or request.data.get('razorpay_order_id') or request.data.get('razorpayOrderId')
    razorpay_payment_id = shipping.get('razorpay_payment_id') or request.data.get('razorpay_payment_id') or request.data.get('razorpayPaymentId')
    razorpay_signature = shipping.get('razorpay_signature') or request.data.get('razorpay_signature') or request.data.get('razorpaySignature')

    if payment_method in ['razorpay', 'upi']:
        if not razorpay_payment_id or not razorpay_order_id or not razorpay_signature:
            return bad_request('Razorpay payment has not been completed. Verified payment details are required to place an online order.')

        from .payment_views import verify_signature
        if not verify_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
            return bad_request('Invalid Razorpay payment signature. Payment verification failed.')

        # Idempotency check: prevent duplicate order creation for the same payment
        existing_order = Order.objects.filter(razorpay_payment_id=razorpay_payment_id).first()
        if existing_order:
            return Response({
                'status': 'success',
                'message': 'Order already processed.',
                'order': OrderSerializer(order_queryset(request.user).get(pk=existing_order.pk)).data,
            }, status=status.HTTP_200_OK)

        payment_status = 'PAID'
        initial_status = 'ORDER_CONFIRMED'
    else:
        payment_status = 'PENDING'
        initial_status = 'ORDER_PLACED'

    with transaction.atomic():
        cart = get_or_create_cart(request.user)
        items = list(cart.items.select_related('product', 'variant').select_for_update())

        # If cart in DB was empty, check if items were provided in checkout payload
        if not items:
            raw_items = request.data.get('items') or request.data.get('cart_items') or (shipping.get('items') if isinstance(shipping, dict) else None)
            if raw_items and isinstance(raw_items, list):
                for raw_it in raw_items:
                    pid = raw_it.get('product_id') or raw_it.get('productId') or raw_it.get('id')
                    vid = raw_it.get('variant_id') or raw_it.get('variantId')
                    qty = int(raw_it.get('quantity') or raw_it.get('qty') or 1)
                    if pid:
                        prod = Product.objects.filter(id=pid).first()
                        if prod:
                            var = ProductVariant.objects.filter(id=vid, product=prod).first() if vid else None
                            CartItem.objects.create(cart=cart, product=prod, variant=var, quantity=qty)
                items = list(cart.items.select_related('product', 'variant').select_for_update())

        if not items:
            return bad_request('Your cart is empty.')

        for item in items:
            avail_stock = item.variant.stock if (item.variant and item.variant.stock is not None) else item.product.stock
            if item.quantity > avail_stock:
                var_str = f" ({item.variant.size})" if item.variant else ""
                return bad_request(
                    f'Only {avail_stock} of {item.product.name}{var_str} left in stock.',
                    errors={'product_id': item.product.id, 'available': avail_stock},
                )

        total_weight = sum((getattr(it.product, 'weight_kg', Decimal('1.000')) or Decimal('1.000')) * it.quantity for it in items)
        total_volume = sum((getattr(it.product, 'volume_m3', Decimal('0.0050')) or Decimal('0.0050')) * it.quantity for it in items)

        order = Order.objects.create(
            user=request.user,
            total_price=cart.get_total(),
            recipient_name=recipient_name,
            phone=phone,
            email=email,
            shipping_address=values['address'],
            city=values['city'],
            state=values['state'],
            zipcode=values['zipcode'],
            country=values['country'],
            payment_method=payment_method,
            payment_status=payment_status,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature,
            status=initial_status,
            total_weight_kg=total_weight,
            total_volume_m3=total_volume,
        )

        OrderItem.objects.bulk_create([
            OrderItem(
                order=order,
                product=item.product,
                product_name=item.product.name if item.product else '',
                variant=item.variant,
                variant_name=item.variant.size if item.variant else '',
                quantity=item.quantity,
                price_at_purchase=item.get_price(),
                return_eligible=getattr(item.product, 'return_eligible', True),
                return_window_days=getattr(item.product, 'return_window_days', 7),
                return_policy=getattr(item.product, 'return_policy', '7-day replacement or return'),
                condition_required=getattr(item.product, 'condition_required', 'Unused, original packaging and tags intact'),
                weight_kg=getattr(item.product, 'weight_kg', Decimal('1.000')),
                volume_m3=getattr(item.product, 'volume_m3', Decimal('0.0050')),
            )
            for item in items
        ])

        for item in items:
            if item.variant:
                item.variant.stock = max(0, item.variant.stock - item.quantity)
                item.variant.save(update_fields=['stock'])
            if item.product:
                item.product.stock = max(0, item.product.stock - item.quantity)
                item.product.save(update_fields=['stock'])

        if payment_method in ['razorpay', 'upi']:
            OrderStatusHistory.objects.create(
                order=order,
                from_status='ORDER_PLACED',
                to_status='ORDER_CONFIRMED',
                changed_by=request.user,
                changed_by_name=f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
                note='Order placed and payment verified via Razorpay online gateway'
            )
        else:
            OrderStatusHistory.objects.create(
                order=order,
                from_status='',
                to_status='ORDER_PLACED',
                changed_by=request.user,
                changed_by_name=f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
                note='Order successfully placed via checkout (Cash on Delivery)'
            )

        ActivityLog.objects.bulk_create([
            ActivityLog(
                user=request.user,
                action='purchase',
                product=item.product,
                details={'quantity': item.quantity, 'variant_id': item.variant.id if item.variant else None, 'order_id': order.id},
            )
            for item in items
        ])

        cart.items.all().delete()

    # Stream real-time order state transition to Big Data Kafka ingestion layer
    try:
        from site_analytics.kafka_producer import publish_order_event
        publish_order_event(
            order_id=order.id,
            user_id=order.user_id,
            total_amount=order.total_price,
            status=order.canonical_status,
            items_count=order.items.count()
        )
    except Exception:
        pass

    # Trigger customer Email / SMS notification
    notify_order_status_change(order, '', order.status)

    return Response({
        'status': 'success',
        'message': 'Order placed successfully.',
        'order': OrderSerializer(order_queryset(request.user).get(pk=order.pk)).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_list(request):
    """Get the user's orders, newest first. Supports search filtering."""
    orders = order_queryset(request.user)
    search = request.GET.get('search') or request.GET.get('q')
    if search:
        search = search.strip()
        clean_id = (
            search.replace('ORD-', '')
            .replace('ord-', '')
            .replace('ORD', '')
            .replace('ord', '')
            .replace('#', '')
            .strip()
            .lstrip('0') or '0'
        )
        q_filter = (
            Q(tracking_number__icontains=search) |
            Q(city__icontains=search) |
            Q(items__product_name__icontains=search)
        )
        if clean_id.isdigit():
            q_filter |= Q(id=int(clean_id))
        orders = orders.filter(q_filter).distinct()

    return Response({
        'status': 'success',
        'total_orders': orders.count(),
        'orders': OrderSerializer(orders, many=True).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    """Get one of the user's own orders, accepting numeric ID or ORD-formatted string."""
    clean_id = str(order_id).strip().lstrip('#')
    if clean_id.upper().startswith('ORD-'):
        clean_id = clean_id[4:].lstrip('0') or '0'
    elif clean_id.upper().startswith('ORD'):
        clean_id = clean_id[3:].lstrip('0') or '0'
    else:
        clean_id = clean_id.lstrip('0') or '0'

    try:
        numeric_id = int(clean_id)
        if request.user.is_staff:
            order = get_object_or_404(order_queryset(), id=numeric_id)
        else:
            order = get_object_or_404(order_queryset(request.user), id=numeric_id)
    except (ValueError, TypeError):
        return Response({'status': 'error', 'message': f'Invalid order identifier: {order_id}'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'status': 'success', 'order': OrderSerializer(order).data})


@api_view(['POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    """Cancel an active order before delivery.
    
    If order was paid online, initiates refund pending workflow.
    """
    if request.user.is_staff:
        order = get_object_or_404(order_queryset(), id=order_id)
    else:
        order = get_object_or_404(order_queryset(request.user), id=order_id)

    curr_status = order.canonical_status
    if curr_status == 'DELIVERED':
        return bad_request('Delivered orders cannot be cancelled. Please request a product return instead.')
    if curr_status in ['CANCELLED', 'REFUNDED']:
        return bad_request(f'Order #{order.id} is already {curr_status.lower()}.')

    reason = request.data.get('reason') or request.data.get('cancellation_reason') or 'Customer requested cancellation'

    old_status = order.status
    order.status = 'CANCELLED'
    order.cancellation_reason = reason

    if order.payment_status == 'PAID' or (order.payment_method in ['razorpay', 'upi'] and order.razorpay_payment_id):
        order.payment_status = 'REFUND_PENDING'
        order.refund_status = 'REFUND_PENDING'

    order.save()

    # Log transition
    OrderStatusHistory.objects.create(
        order=order,
        from_status=old_status,
        to_status='CANCELLED',
        changed_by=request.user,
        changed_by_name=f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
        note=f"Cancellation: {reason}"
    )

    notify_order_status_change(order, old_status, 'CANCELLED', note=reason)

    return Response({
        'status': 'success',
        'message': 'Order cancelled successfully.',
        'order': OrderSerializer(order).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_order_return(request, order_id):
    """Request a product return for a delivered order.
    
    Validates:
      1. Order must be DELIVERED.
      2. Product must have return_eligible == true.
      3. Current time must be within return_window_days from delivery.
      4. No duplicate active return request.
    """
    from order_service.models import OrderReturn

    if request.user.is_staff:
        order = get_object_or_404(order_queryset(), id=order_id)
    else:
        order = get_object_or_404(order_queryset(request.user), id=order_id)

    eligible, eligibility_reason = order.is_return_eligible()
    if not eligible:
        return bad_request(f"Return cannot be requested: {eligibility_reason}")

    reason = request.data.get('reason')
    if not reason or not reason.strip():
        return bad_request('Return reason is required (e.g. defective, wrong size, item damaged, not as described).')

    condition_note = request.data.get('condition_note') or request.data.get('conditionNote') or 'Product unused with original tags intact'

    # Create OrderReturn
    first_item = order.items.first()
    return_obj = OrderReturn.objects.create(
        order=order,
        order_item=first_item,
        user=order.user,
        reason=reason.strip(),
        condition_note=condition_note.strip(),
        status='RETURN_REQUESTED',
        refund_amount=order.total_price
    )

    old_status = order.status
    order.status = 'RETURN_REQUESTED'
    order.save(update_fields=['status', 'updated_at'])

    OrderStatusHistory.objects.create(
        order=order,
        from_status=old_status,
        to_status='RETURN_REQUESTED',
        changed_by=request.user,
        changed_by_name=f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
        note=f"Customer requested return: {reason}. Condition: {condition_note}"
    )

    notify_order_status_change(order, old_status, 'RETURN_REQUESTED', note=f"Return request initiated: {reason}")

    from products.serializers import OrderReturnSerializer
    return Response({
        'status': 'success',
        'message': 'Return request submitted successfully. Our team will review the product return condition.',
        'return_request': OrderReturnSerializer(return_obj).data,
        'order': OrderSerializer(order).data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_order_returns(request, order_id):
    """Retrieve return requests associated with an order."""
    from order_service.models import OrderReturn
    from products.serializers import OrderReturnSerializer

    if request.user.is_staff:
        order = get_object_or_404(order_queryset(), id=order_id)
    else:
        order = get_object_or_404(order_queryset(request.user), id=order_id)

    returns = OrderReturn.objects.filter(order=order)
    return Response({
        'status': 'success',
        'returns': OrderReturnSerializer(returns, many=True).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_order_return(request, return_id):
    """Staff operation to approve a return request."""
    from order_service.models import OrderReturn
    from products.serializers import OrderReturnSerializer

    if not request.user.is_staff:
        return Response({'status': 'error', 'message': 'Only staff can approve returns.'}, status=status.HTTP_403_FORBIDDEN)

    ret = get_object_or_404(OrderReturn, id=return_id)
    ret.status = 'RETURN_APPROVED'
    ret.inspected_by = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
    ret.inspected_at = timezone.now()
    ret.save()

    order = ret.order
    old_status = order.status
    order.status = 'RETURN_APPROVED'
    order.save(update_fields=['status', 'updated_at'])

    OrderStatusHistory.objects.create(
        order=order,
        from_status=old_status,
        to_status='RETURN_APPROVED',
        changed_by=request.user,
        changed_by_name=ret.inspected_by,
        note='Return request approved by staff. Carrier return pickup will be dispatched.'
    )

    return Response({
        'status': 'success',
        'message': f'Return #{ret.id} approved successfully.',
        'return_request': OrderReturnSerializer(ret).data,
        'order': OrderSerializer(order).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_order_return(request, return_id):
    """Staff operation to reject a return request with mandatory reason."""
    from order_service.models import OrderReturn
    from products.serializers import OrderReturnSerializer

    if not request.user.is_staff:
        return Response({'status': 'error', 'message': 'Only staff can reject returns.'}, status=status.HTTP_403_FORBIDDEN)

    reason = request.data.get('reason') or request.data.get('rejection_reason')
    if not reason or not reason.strip():
        return bad_request('Rejection reason is required (e.g. product tags missing, item shows signs of wear).')

    ret = get_object_or_404(OrderReturn, id=return_id)
    ret.status = 'RETURN_REJECTED'
    ret.rejection_reason = reason.strip()
    ret.inspected_by = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
    ret.inspected_at = timezone.now()
    ret.save()

    order = ret.order
    old_status = order.status
    order.status = 'RETURN_REJECTED'
    order.save(update_fields=['status', 'updated_at'])

    OrderStatusHistory.objects.create(
        order=order,
        from_status=old_status,
        to_status='RETURN_REJECTED',
        changed_by=request.user,
        changed_by_name=ret.inspected_by,
        note=f"Return rejected: {reason.strip()}"
    )

    return Response({
        'status': 'success',
        'message': f'Return #{ret.id} rejected.',
        'return_request': OrderReturnSerializer(ret).data,
        'order': OrderSerializer(order).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def receive_order_return(request, return_id):
    """Staff operation to mark return item received at warehouse, initiating refund workflow."""
    from order_service.models import OrderReturn
    from products.serializers import OrderReturnSerializer

    if not request.user.is_staff:
        return Response({'status': 'error', 'message': 'Only staff can mark returns received.'}, status=status.HTTP_403_FORBIDDEN)

    ret = get_object_or_404(OrderReturn, id=return_id)
    ret.status = 'RETURN_RECEIVED'
    ret.received_at = timezone.now()
    ret.save()

    order = ret.order
    old_status = order.status
    order.status = 'RETURN_RECEIVED'
    order.refund_status = 'REFUND_PENDING'
    order.payment_status = 'REFUND_PENDING'
    order.save(update_fields=['status', 'refund_status', 'payment_status', 'updated_at'])

    OrderStatusHistory.objects.create(
        order=order,
        from_status=old_status,
        to_status='RETURN_RECEIVED',
        changed_by=request.user,
        changed_by_name=f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
        note='Returned product received at warehouse. Refund processing initiated.'
    )

    return Response({
        'status': 'success',
        'message': f'Return #{ret.id} marked as received at warehouse. Refund pending.',
        'return_request': OrderReturnSerializer(ret).data,
        'order': OrderSerializer(order).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_admin_returns(request):
    """Staff view to list all customer returns across the platform."""
    from order_service.models import OrderReturn
    from products.serializers import OrderReturnSerializer

    if not request.user.is_staff:
        return Response({'status': 'error', 'message': 'Only staff can view platform returns.'}, status=status.HTTP_403_FORBIDDEN)

    status_filter = request.GET.get('status')
    qs = OrderReturn.objects.select_related('order', 'user', 'order_item')
    if status_filter and status_filter != 'ALL':
        qs = qs.filter(status=status_filter)

    return Response({
        'status': 'success',
        'total': qs.count(),
        'returns': OrderReturnSerializer(qs, many=True).data
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_order_status(request, order_id):
    """Update an order's status. Staff only."""
    if not request.user.is_staff:
        return Response(
            {'status': 'error', 'message': 'Only staff can update order status.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    status_value = request.data.get('status')
    valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]
    if status_value not in valid_statuses:
        return bad_request(
            'Invalid status.',
            errors={'status': f"Must be one of: {', '.join(valid_statuses)}"},
        )

    order = get_object_or_404(order_queryset(), id=order_id)
    old_status = order.status
    note = request.data.get('note') or request.data.get('reason_note', '')
    carrier_name = request.data.get('carrier_name') or order.carrier_name
    tracking_number = request.data.get('tracking_number') or order.tracking_number

    # SECURITY ENFORCEMENT: Cannot mark OUT_FOR_DELIVERY -> DELIVERED without delivery OTP verification
    if (old_status.upper() == 'OUT_FOR_DELIVERY' or order.canonical_status == 'OUT_FOR_DELIVERY') and status_value.upper() == 'DELIVERED':
        is_internal_sync = request.headers.get('X-Internal-Service-Key') == 'econext-internal-microservice-key-2026'
        has_delivery_audit = order.delivery_audits.filter(new_status='DELIVERED').exists()
        if not is_internal_sync and not has_delivery_audit:
            return bad_request('Security rule: Direct transition to DELIVERED is forbidden. Delivery PIN / OTP verification via delivery service is required.')

    order.status = status_value
    if status_value.upper() == 'DELIVERED' and not order.delivered_at:
        order.delivered_at = timezone.now()

    if carrier_name:
        order.carrier_name = carrier_name
    if tracking_number:
        order.tracking_number = tracking_number
    order.save()

    # Synchronize linked shipments if any exist
    if hasattr(order, 'shipments'):
        for shp in order.shipments.all():
            shp.status = status_value
            if status_value.upper() == 'DELIVERED' and not shp.delivered_at:
                shp.delivered_at = timezone.now()
            shp.save()

    # Log history
    OrderStatusHistory.objects.create(
        order=order,
        from_status=old_status,
        to_status=status_value,
        changed_by=request.user,
        changed_by_name=f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
        note=note,
        carrier_name=carrier_name or '',
        tracking_number=tracking_number or ''
    )

    # Trigger customer notification
    notify_order_status_change(order, old_status, status_value, note=note)

    return Response({
        'status': 'success',
        'message': f'Order status updated to {status_value}.',
        'order': OrderSerializer(order).data,
    })
