"""
Admin Panel REST Endpoints for EcoNext.
Protected by Role-Based Access Control (RBAC): requires is_staff or is_superuser.
"""

import os
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, BasePermission
from rest_framework.response import Response

from products.models import (
    Product, Category, SubCategory, AgeGroup, GenderCategory,
    EcoTag, Season, Occasion, PriceHistory
)
from products.serializers import ProductSerializer, CategorySerializer, OrderSerializer
from order_service.models import Order, OrderItem, OrderStatusHistory, NotificationLog
from order_service.notification_service import notify_order_status_change
from accounts.serializers import UserSerializer
from site_analytics.kafka_producer import publish_order_event


class IsAdminOrInternalService(BasePermission):
    """
    Grants access if the request is from an authenticated Django admin/staff user
    OR if the request carries a valid X-Internal-Service-Key from a trusted microservice.
    """
    def has_permission(self, request, view):
        internal_key = request.headers.get('X-Internal-Service-Key') or request.META.get('HTTP_X_INTERNAL_SERVICE_KEY')
        configured_key = os.getenv('INTERNAL_SERVICE_KEY', 'econext-internal-microservice-key-2026')
        if internal_key and internal_key == configured_key:
            return True
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser))


@api_view(['GET'])
@permission_classes([IsAdminOrInternalService])
def admin_dashboard_stats(request):
    """
    Returns aggregated KPI statistics, recent orders, order status distribution,
    and 7-day sales trends computed directly from existing database records.
    """
    total_products = Product.objects.count()
    low_stock_count = Product.objects.filter(stock__lte=5).count()
    out_of_stock_count = Product.objects.filter(stock=0).count()
    total_categories = Category.objects.count()
    total_users = User.objects.count()
    
    # Orders aggregation
    orders_qs = Order.objects.all()
    total_orders = orders_qs.count()
    
    delivered_orders = orders_qs.filter(status='delivered')
    total_revenue_delivered = delivered_orders.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
    total_revenue_all = orders_qs.exclude(status='cancelled').aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
    
    # Status breakdown
    status_counts = orders_qs.values('status').annotate(count=Count('id'))
    status_map = {item['status']: item['count'] for item in status_counts}
    
    # Last 7 days sales trend
    today = timezone.now().date()
    sales_trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_orders = orders_qs.filter(created_at__date=day).exclude(status='cancelled')
        day_revenue = day_orders.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
        sales_trend.append({
            'date': day.strftime('%d %b'),
            'orders': day_orders.count(),
            'revenue': float(day_revenue)
        })
        
    # Recent orders (latest 10)
    recent_orders = []
    for o in orders_qs.select_related('user').prefetch_related('items__product')[:10]:
        recent_orders.append({
            'id': o.id,
            'customer': f"{o.user.first_name} {o.user.last_name}".strip() or o.user.username,
            'email': o.user.email,
            'total_price': float(o.total_price),
            'status': o.status,
            'items_count': o.items.count(),
            'created_at': o.created_at.strftime('%Y-%m-%d %H:%M')
        })
        
    # Top sustainable products by score
    top_sustainable = Product.objects.filter(sustainability_score__gt=0).order_by('-sustainability_score')[:5]
    top_sustainable_data = [
        {
            'id': p.id,
            'name': p.name,
            'category': p.category.name if p.category else 'Uncategorized',
            'current_price': float(p.current_price),
            'stock': p.stock,
            'sustainability_score': p.sustainability_score
        }
        for p in top_sustainable
    ]

    metrics_data = {
        'total_revenue': float(total_revenue_all),
        'total_revenue_delivered': float(total_revenue_delivered),
        'total_orders': total_orders,
        'pending_orders': status_map.get('pending', 0),
        'confirmed_orders': status_map.get('confirmed', 0),
        'shipped_orders': status_map.get('shipped', 0),
        'delivered_orders': status_map.get('delivered', 0),
        'cancelled_orders': status_map.get('cancelled', 0),
        'total_products': total_products,
        'low_stock_count': low_stock_count,
        'low_stock_products': low_stock_count,
        'out_of_stock_products': out_of_stock_count,
        'total_categories': total_categories,
        'total_users': total_users,
        'recent_orders': recent_orders,
        'sales_trend': sales_trend,
        'top_sustainable': top_sustainable_data
    }

    return Response({
        'status': 'success',
        'metrics': metrics_data,
        'data': metrics_data,
        'sales_trend': sales_trend,
        'recent_orders': recent_orders,
        'top_sustainable': top_sustainable_data
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrInternalService])
def admin_products_list_create(request):
    """
    GET: List all products with filtering, search, stock levels.
    POST: Create a new product.
    """
    if request.method == 'GET':
        qs = Product.objects.select_related('category', 'subcategory', 'season', 'occasion').prefetch_related('eco_tags', 'age_groups', 'gender_categories').all()
        
        search = request.GET.get('search', '').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
            
        category_id = request.GET.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)
            
        stock_status = request.GET.get('stock_status')
        if stock_status == 'low':
            qs = qs.filter(stock__lte=5, stock__gt=0)
        elif stock_status == 'out':
            qs = qs.filter(stock=0)
            
        serializer = ProductSerializer(qs, many=True)
        return Response({
            'status': 'success',
            'count': qs.count(),
            'products': serializer.data
        })
        
    elif request.method == 'POST':
        data = request.data
        try:
            category_id = data.get('category')
            category = Category.objects.get(id=category_id) if category_id else None
            if not category:
                return Response({'status': 'error', 'message': 'Valid category is required'}, status=status.HTTP_400_BAD_REQUEST)
                
            product = Product.objects.create(
                name=data.get('name', '').strip(),
                description=data.get('description', '').strip(),
                category=category,
                current_price=Decimal(str(data.get('current_price', '0.00'))),
                image_url=data.get('image_url', ''),
                stock=int(data.get('stock', 10)),
                sustainability_score=float(data.get('sustainability_score', 8.5)),
                popularity_score=float(data.get('popularity_score', 5.0)),
                tags=data.get('tags', ['sustainable', 'eco-friendly'])
            )
            
            # Link PriceHistory initial entry
            PriceHistory.objects.create(
                product=product,
                price=product.current_price,
                date=timezone.now().date()
            )
            
            if 'eco_tags' in data and isinstance(data['eco_tags'], list):
                product.eco_tags.set(data['eco_tags'])
                
            if 'age_groups' in data and isinstance(data['age_groups'], list):
                product.age_groups.set(data['age_groups'])
                
            if 'gender_categories' in data and isinstance(data['gender_categories'], list):
                product.gender_categories.set(data['gender_categories'])
                
            return Response({
                'status': 'success',
                'message': 'Product created successfully',
                'product': ProductSerializer(product).data
            }, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrInternalService])
def admin_product_detail(request, pk):
    """
    GET, PUT, PATCH, DELETE operations for single product.
    """
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'status': 'error', 'message': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'GET':
        return Response({'status': 'success', 'product': ProductSerializer(product).data})
        
    elif request.method in ['PUT', 'PATCH']:
        data = request.data
        if 'name' in data:
            product.name = data['name']
        if 'description' in data:
            product.description = data['description']
        if 'category' in data:
            product.category_id = data['category']
        if 'stock' in data:
            product.stock = int(data['stock'])
        if 'image_url' in data:
            product.image_url = data['image_url']
        if 'sustainability_score' in data:
            product.sustainability_score = float(data['sustainability_score'])
        if 'popularity_score' in data:
            product.popularity_score = float(data['popularity_score'])
        if 'tags' in data:
            product.tags = data['tags']
            
        if 'current_price' in data:
            new_price = Decimal(str(data['current_price']))
            if new_price != product.current_price:
                product.current_price = new_price
                PriceHistory.objects.update_or_create(
                    product=product,
                    date=timezone.now().date(),
                    defaults={'price': new_price}
                )
                
        if 'eco_tags' in data and isinstance(data['eco_tags'], list):
            product.eco_tags.set(data['eco_tags'])
            
        product.save()
        return Response({'status': 'success', 'message': 'Product updated', 'product': ProductSerializer(product).data})
        
    elif request.method == 'DELETE':
        product_name = product.name
        product.delete()
        return Response({'status': 'success', 'message': f"Product '{product_name}' deleted successfully"})


@api_view(['GET'])
@permission_classes([IsAdminOrInternalService])
def admin_orders_list(request):
    """
    List all orders with detailed customer, items, payment, and tracking information.
    Supports filtering by status, payment_status, search query, and pagination.
    """
    orders = Order.objects.select_related('user').prefetch_related(
        'items__product',
        'status_history'
    ).all().order_by('-created_at')
    
    status_filter = request.GET.get('status')
    if status_filter and status_filter != 'ALL':
        status_alias_map = {
            'ORDER_PLACED': ['pending', 'PENDING', 'ORDER_PLACED', 'order_placed'],
            'ORDER_CONFIRMED': ['confirmed', 'CONFIRMED', 'payment_confirmed', 'PAYMENT_CONFIRMED', 'order_accepted', 'ORDER_ACCEPTED'],
            'PAYMENT_CONFIRMED': ['payment_confirmed', 'PAYMENT_CONFIRMED', 'confirmed', 'CONFIRMED'],
            'ORDER_ACCEPTED': ['order_accepted', 'ORDER_ACCEPTED'],
            'PROCESSING': ['processing', 'PROCESSING', 'packed', 'PACKED'],
            'PACKED': ['packed', 'PACKED', 'processing', 'PROCESSING'],
            'SHIPPED': ['shipped', 'SHIPPED'],
            'IN_TRANSIT': ['in_transit', 'IN_TRANSIT', 'out_for_delivery', 'OUT_FOR_DELIVERY'],
            'OUT_FOR_DELIVERY': ['out_for_delivery', 'OUT_FOR_DELIVERY', 'in_transit', 'IN_TRANSIT'],
            'DELIVERED': ['delivered', 'DELIVERED'],
            'CANCELLED': ['cancelled', 'CANCELLED', 'payment_failed', 'refunded', 'PAYMENT_FAILED', 'REFUNDED'],
            'PENDING': ['pending', 'PENDING', 'ORDER_PLACED'],
            'CONFIRMED': ['confirmed', 'CONFIRMED', 'payment_confirmed', 'PAYMENT_CONFIRMED', 'order_accepted', 'ORDER_ACCEPTED']
        }
        aliases = status_alias_map.get(status_filter.upper(), [status_filter, status_filter.lower(), status_filter.upper()])
        q_obj = Q()
        for a in aliases:
            q_obj |= Q(status__iexact=a)
        orders = orders.filter(q_obj)

    payment_status_filter = request.GET.get('payment_status')
    if payment_status_filter and payment_status_filter != 'ALL':
        orders = orders.filter(payment_status__iexact=payment_status_filter)

    search = request.GET.get('search', '').strip()
    if search:
        # Search by order ID, customer name, email, city, tracking number
        clean_id = search.replace('ORD-', '').replace('ord-', '').replace('#', '').strip()
        search_filter = (
            Q(user__username__icontains=search) |
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search) |
            Q(user__email__icontains=search) |
            Q(recipient_name__icontains=search) |
            Q(city__icontains=search) |
            Q(tracking_number__icontains=search)
        )
        if clean_id.isdigit():
            search_filter |= Q(id=int(clean_id))
        orders = orders.filter(search_filter)
        
    results = OrderSerializer(orders, many=True).data
    return Response({'status': 'success', 'count': len(results), 'orders': results, 'data': results})


@api_view(['GET'])
@permission_classes([IsAdminOrInternalService])
def admin_order_detail(request, pk):
    """
    Retrieve single order by ID with complete details, items, payment, timeline, and history.
    """
    try:
        order = Order.objects.select_related('user').prefetch_related('items__product', 'status_history').get(pk=pk)
    except Order.DoesNotExist:
        return Response({'status': 'error', 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'status': 'success', 'order': OrderSerializer(order).data, 'data': OrderSerializer(order).data})


@api_view(['PATCH', 'POST', 'PUT'])
@permission_classes([IsAdminOrInternalService])
def admin_order_status_update(request, order_id):
    """
    Update order status with lifecycle validation, carrier/tracking attribution,
    audit history recording, customer email/SMS notifications, and event streaming.
    """
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response({'status': 'error', 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
    raw_new_status = request.data.get('status') or request.data.get('newStatus')
    if not raw_new_status:
        return Response({'status': 'error', 'message': 'Status parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    canonical_map = {
        'PENDING': 'ORDER_PLACED',
        'ORDER_PLACED': 'ORDER_PLACED',
        'ORDER_ACCEPTED': 'ORDER_CONFIRMED',
        'PAYMENT_CONFIRMED': 'ORDER_CONFIRMED',
        'CONFIRMED': 'ORDER_CONFIRMED',
        'ORDER_CONFIRMED': 'ORDER_CONFIRMED',
        'PROCESSING': 'PROCESSING',
        'PACKED': 'PACKED',
        'SHIPPED': 'SHIPPED',
        'IN_TRANSIT': 'IN_TRANSIT',
        'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
        'DELIVERED': 'DELIVERED',
        'CANCELLED': 'CANCELLED',
        'CANCELED': 'CANCELLED',
        'REFUNDED': 'REFUNDED',
        'RETURNED': 'REFUNDED'
    }

    target_canonical = canonical_map.get(str(raw_new_status).upper().replace(' ', '_'))
    if not target_canonical:
        return Response({'status': 'error', 'message': f"Invalid status '{raw_new_status}'."}, status=status.HTTP_400_BAD_REQUEST)

    curr_canonical = order.canonical_status

    # Sequential state machine validation rules
    ALLOWED_STATE_TRANSITIONS = {
        'ORDER_PLACED': ['ORDER_CONFIRMED', 'CANCELLED'],
        'ORDER_CONFIRMED': ['PROCESSING', 'CANCELLED'],
        'PROCESSING': ['PACKED', 'CANCELLED'],
        'PACKED': ['SHIPPED', 'CANCELLED'],
        'SHIPPED': ['IN_TRANSIT', 'CANCELLED'],
        'IN_TRANSIT': ['OUT_FOR_DELIVERY', 'CANCELLED'],
        'OUT_FOR_DELIVERY': ['DELIVERED', 'CANCELLED'],
        'DELIVERED': [],
        'CANCELLED': [],
        'REFUNDED': []
    }

    allowed_targets = ALLOWED_STATE_TRANSITIONS.get(curr_canonical, [])
    # Check if transition is allowed
    if target_canonical not in allowed_targets and target_canonical != curr_canonical:
        return Response({
            'status': 'error',
            'message': f"Invalid state transition from {curr_canonical} to {target_canonical}. Allowed next states: {', '.join(allowed_targets) if allowed_targets else 'None (Terminal state)'}"
        }, status=status.HTTP_400_BAD_REQUEST)

    old_status = order.status
    note = request.data.get('reasonNote') or request.data.get('note', '')
    carrier_name = request.data.get('carrierName') or request.data.get('carrier_name') or order.carrier_name
    tracking_number = request.data.get('trackingNumber') or request.data.get('tracking_number') or order.tracking_number

    order.status = target_canonical
    if carrier_name:
        order.carrier_name = carrier_name
    if tracking_number:
        order.tracking_number = tracking_number
    order.save()

    staff_name = 'Staff Member'
    if request.user and request.user.is_authenticated:
        staff_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username

    # Record transition audit history
    OrderStatusHistory.objects.create(
        order=order,
        from_status=curr_canonical,
        to_status=target_canonical,
        changed_by=request.user if request.user and request.user.is_authenticated else None,
        changed_by_name=staff_name,
        note=note,
        carrier_name=carrier_name or '',
        tracking_number=tracking_number or ''
    )

    # Dispatch customer Email & SMS notifications
    notify_order_status_change(order, curr_canonical, target_canonical, note=note)

    # Stream real-time order state transition to Big Data Kafka ingestion layer
    try:
        publish_order_event(
            order_id=order.id,
            user_id=order.user_id,
            total_amount=order.total_price,
            status=target_canonical,
            items_count=order.items.count()
        )
    except Exception:
        pass

    return Response({
        'status': 'success',
        'message': f"Order #{order.order_reference_number} status updated to {target_canonical}",
        'order': OrderSerializer(order).data,
        'status_value': target_canonical,
        'data': OrderSerializer(order).data
    })


@api_view(['GET'])
@permission_classes([IsAdminOrInternalService])
def admin_payments_list(request):
    """
    List all transactions and payment records with customer, order reference, gateway, and verification status.
    """
    orders = Order.objects.select_related('user').all().order_by('-created_at')
    
    results = []
    for o in orders:
        results.append({
            'id': o.id,
            'order_id': o.id,
            'order_reference_number': o.order_reference_number,
            'customer_name': o.recipient_name or (f"{o.user.first_name} {o.user.last_name}".strip() if o.user else 'Customer'),
            'customer_email': o.email or (o.user.email if o.user else ''),
            'amount': float(o.total_price),
            'payment_method': o.payment_method,
            'payment_status': o.payment_status,
            'razorpay_order_id': o.razorpay_order_id,
            'razorpay_payment_id': o.razorpay_payment_id,
            'created_at': o.created_at.strftime('%Y-%m-%d %H:%M'),
            'status': o.status
        })
    return Response({'status': 'success', 'count': len(results), 'payments': results, 'data': results})


@api_view(['GET'])
@permission_classes([IsAdminOrInternalService])
def admin_notifications_list(request):
    """
    List all dispatched customer notification logs (Email, SMS, in-app).
    """
    logs = NotificationLog.objects.select_related('order', 'user').all().order_by('-created_at')[:100]
    results = []
    for n in logs:
        results.append({
            'id': n.id,
            'order_id': n.order_id,
            'order_reference': n.order.order_reference_number if n.order else f"ORD-{n.order_id}",
            'notification_type': n.notification_type,
            'recipient': n.recipient,
            'subject': n.subject,
            'message': n.message,
            'status': n.status,
            'trigger_event': n.trigger_event,
            'created_at': n.created_at.strftime('%Y-%m-%d %H:%M')
        })
    return Response({'status': 'success', 'count': len(results), 'notifications': results, 'data': results})


@api_view(['GET'])
@permission_classes([IsAdminOrInternalService])
def admin_users_list(request):
    """
    List all platform users with roles, order counts, and total spend.
    """
    users = User.objects.prefetch_related('orders', 'profile').all().order_by('-date_joined')
    results = []
    for u in users:
        user_orders = u.orders.all()
        total_spent = user_orders.exclude(status__in=['cancelled', 'CANCELLED']).aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
        results.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'name': f"{u.first_name} {u.last_name}".strip() or u.username,
            'is_staff': u.is_staff,
            'is_superuser': u.is_superuser,
            'role': 'admin' if (u.is_staff or u.is_superuser) else 'user',
            'orders_count': user_orders.count(),
            'total_spent': float(total_spent),
            'date_joined': u.date_joined.strftime('%Y-%m-%d %H:%M')
        })
    return Response({'status': 'success', 'count': len(results), 'users': results, 'data': results})


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrInternalService])
def admin_categories_list_create(request):
    """
    List categories with item counts or create new category.
    """
    if request.method == 'GET':
        categories = Category.objects.annotate(products_count=Count('products')).all()
        data = [
            {
                'id': c.id,
                'name': c.name,
                'description': c.description,
                'products_count': c.products_count
            }
            for c in categories
        ]
        return Response({'status': 'success', 'categories': data})
        
    elif request.method == 'POST':
        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()
        if not name:
            return Response({'status': 'error', 'message': 'Category name is required'}, status=status.HTTP_400_BAD_REQUEST)
        if Category.objects.filter(name__iexact=name).exists():
            return Response({'status': 'error', 'message': 'Category with this name already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
        category = Category.objects.create(name=name, description=description)
        return Response({
            'status': 'success',
            'message': 'Category created successfully',
            'category': {'id': category.id, 'name': category.name, 'description': category.description, 'products_count': 0}
        }, status=status.HTTP_201_CREATED)
