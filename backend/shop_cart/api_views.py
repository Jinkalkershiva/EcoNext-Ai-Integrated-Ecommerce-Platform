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

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import ActivityLog
from order_service.models import Order, OrderItem
from products.models import Product
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
            'items__product__category',
            'items__product__subcategory',
            'items__product__age_groups',
            'items__product__gender_categories',
            'items__product__eco_tags',
            'items__product__skin_or_body_fit',
            'items__product__season',
            'items__product__occasion',
        )
        .get(pk=cart.pk)
    )
    payload = {'status': 'success', 'cart': CartSerializer(cart).data}
    if message:
        payload['message'] = message
    payload.update(extra)
    return Response(payload)


def order_queryset(user=None):
    """Orders with their nested product data prefetched."""
    queryset = Order.objects.prefetch_related(
        'items__product__category',
        'items__product__subcategory',
        'items__product__age_groups',
        'items__product__gender_categories',
        'items__product__eco_tags',
        'items__product__skin_or_body_fit',
        'items__product__season',
        'items__product__occasion',
    )
    if user is not None:
        queryset = queryset.filter(user=user)
    return queryset


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
    """Add a product to the cart, or increase its quantity if already present."""
    product_id = request.data.get('product_id') or request.data.get('product')
    if not product_id:
        return bad_request('product_id is required.')

    quantity, error = parse_quantity(request.data.get('quantity', 1))
    if error:
        return bad_request(error)

    product = get_object_or_404(Product, id=product_id)

    with transaction.atomic():
        cart = get_or_create_cart(request.user)
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, product=product, defaults={'quantity': quantity}
        )
        if not created:
            quantity = min(cart_item.quantity + quantity, MAX_QUANTITY_PER_ITEM)

        # Don't let the cart hold more than exists. Stock 0 means out of stock.
        if product.stock <= 0:
            if created:
                cart_item.delete()
            return bad_request(f'{product.name} is out of stock.')

        quantity = min(quantity, product.stock)

        if quantity != cart_item.quantity:
            cart_item.quantity = quantity
            cart_item.save(update_fields=['quantity'])

    ActivityLog.objects.create(
        user=request.user,
        action='add_to_cart',
        product=product,
        details={'quantity': cart_item.quantity},
    )

    return cart_response(cart, message=f'{product.name} added to cart.')


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_cart_item(request, item_id):
    """Set a cart item's quantity. Quantity 0 removes the item."""
    if 'quantity' not in request.data:
        return bad_request('quantity is required.')

    quantity, error = parse_quantity(request.data.get('quantity'), allow_zero=True)
    if error:
        return bad_request(error)

    cart_item = get_object_or_404(
        CartItem.objects.select_related('cart', 'product'),
        id=item_id,
        cart__user=request.user,
    )
    cart = cart_item.cart

    if quantity == 0:
        cart_item.delete()
        return cart_response(cart, message='Item removed from cart.')

    product = cart_item.product
    if quantity > product.stock:
        return bad_request(
            f'Only {product.stock} of {product.name} left in stock.',
            available=product.stock,
        )

    cart_item.quantity = quantity
    cart_item.save(update_fields=['quantity'])
    return cart_response(cart)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, item_id):
    """Remove a single item from the cart."""
    cart_item = get_object_or_404(
        CartItem.objects.select_related('cart'), id=item_id, cart__user=request.user
    )
    cart = cart_item.cart
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    """Turn the cart into an order.

    Shipping fields are required because the Order model does not allow blanks —
    the previous version defaulted them to '' and relied on the database to
    accept it. Stock is checked and decremented inside one transaction, so two
    simultaneous checkouts cannot oversell the same item.
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

    with transaction.atomic():
        cart = get_or_create_cart(request.user)
        # select_for_update locks the rows for the duration of the transaction on
        # Postgres; on SQLite it is a no-op, which is fine for single-writer dev.
        items = list(cart.items.select_related('product').select_for_update())

        if not items:
            return bad_request('Your cart is empty.')

        for item in items:
            if item.quantity > item.product.stock:
                return bad_request(
                    f'Only {item.product.stock} of {item.product.name} left in stock.',
                    errors={'product_id': item.product.id, 'available': item.product.stock},
                )

        order = Order.objects.create(
            user=request.user,
            total_price=cart.get_total(),
            shipping_address=values['address'],
            city=values['city'],
            state=values['state'],
            zipcode=values['zipcode'],
            country=values['country'],
        )

        OrderItem.objects.bulk_create([
            OrderItem(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price_at_purchase=item.product.current_price,
            )
            for item in items
        ])

        for item in items:
            item.product.stock = max(0, item.product.stock - item.quantity)
            item.product.save(update_fields=['stock'])

        ActivityLog.objects.bulk_create([
            ActivityLog(
                user=request.user,
                action='purchase',
                product=item.product,
                details={'quantity': item.quantity, 'order_id': order.id},
            )
            for item in items
        ])

        cart.items.all().delete()

    return Response({
        'status': 'success',
        'message': 'Order placed successfully.',
        'order': OrderSerializer(order_queryset(request.user).get(pk=order.pk)).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_list(request):
    """Get the user's orders, newest first."""
    orders = order_queryset(request.user)
    return Response({
        'status': 'success',
        'total_orders': orders.count(),
        'orders': OrderSerializer(orders, many=True).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    """Get one of the user's own orders."""
    order = get_object_or_404(order_queryset(request.user), id=order_id)
    return Response({'status': 'success', 'order': OrderSerializer(order).data})


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
    order.status = status_value
    order.save(update_fields=['status', 'updated_at'])

    return Response({
        'status': 'success',
        'message': f'Order status updated to {status_value}.',
        'order': OrderSerializer(order).data,
    })
