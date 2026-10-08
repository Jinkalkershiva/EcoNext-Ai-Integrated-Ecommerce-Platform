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


def sanitize_image_url(url_str):
    if not url_str or not isinstance(url_str, str):
        return ''
    cleaned = url_str.strip()
    lower = cleaned.lower()
    if lower.startswith('http://') or lower.startswith('https://'):
        return cleaned
    if lower.startswith('//'):
        return f"https:{cleaned}"
    # Block unsafe schemes like javascript: or data: dangerous execution
    return ''


def sanitize_image_list(images):
    if isinstance(images, str):
        images = [i.strip() for i in images.split(',') if i.strip()]
    if not isinstance(images, list):
        return []
    res = []
    for item in images:
        if isinstance(item, str):
            sanitized = sanitize_image_url(item)
            if sanitized and sanitized not in res:
                res.append(sanitized)
    return res


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrInternalService])
def admin_products_list_create(request):
    """
    GET: List all products with filtering, search, stock levels, status, and whitelist.
    POST: Create a new product with flexible DTO field mapping and taxonomy linking.
    """
    if request.method == 'GET':
        qs = Product.objects.select_related('category', 'subcategory', 'season', 'occasion').prefetch_related('eco_tags', 'age_groups', 'gender_categories').all()
        
        search = request.GET.get('search', '').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search) | Q(tags__icontains=search))
            
        category_param = request.GET.get('category') or request.GET.get('categoryId')
        if category_param:
            if str(category_param).isdigit():
                qs = qs.filter(Q(category_id=int(category_param)) | Q(category__name__iexact=str(category_param)))
            else:
                qs = qs.filter(category__name__iexact=str(category_param))
            
        stock_status = request.GET.get('stock_status')
        if stock_status == 'low':
            qs = qs.filter(stock__lte=5, stock__gt=0)
        elif stock_status == 'out':
            qs = qs.filter(stock=0)

        status_param = request.GET.get('status')
        if status_param and status_param.upper() != 'ALL':
            if status_param.upper() == 'WHITELISTED':
                qs = qs.filter(is_whitelisted=True)
            elif status_param.upper() == 'ARCHIVED':
                qs = qs.filter(status='ARCHIVED')
            elif status_param.upper() == 'ACTIVE':
                qs = qs.filter(status='ACTIVE')
            else:
                qs = qs.filter(status__iexact=status_param)

        is_whitelisted_param = request.GET.get('is_whitelisted') or request.GET.get('isWhitelisted')
        if is_whitelisted_param is not None:
            if str(is_whitelisted_param).lower() in ['true', '1']:
                qs = qs.filter(is_whitelisted=True)
            elif str(is_whitelisted_param).lower() in ['false', '0']:
                qs = qs.filter(is_whitelisted=False)
            
        serializer = ProductSerializer(qs, many=True)
        return Response({
            'status': 'success',
            'count': qs.count(),
            'products': serializer.data,
            'data': serializer.data
        })
        
    elif request.method == 'POST':
        data = request.data
        try:
            # Resolve Category
            category = None
            cat_val = data.get('category') or data.get('categoryId') or data.get('category_id') or data.get('categoryName')
            if cat_val is not None:
                if isinstance(cat_val, int) or (isinstance(cat_val, str) and cat_val.isdigit()):
                    category = Category.objects.filter(id=int(cat_val)).first()
                if not category and isinstance(cat_val, str) and cat_val.strip():
                    category = Category.objects.filter(name__iexact=cat_val.strip()).first()
                    if not category:
                        category = Category.objects.create(name=cat_val.strip(), description=f"{cat_val.strip()} Category")

            if not category:
                # Default fallback or first category
                category = Category.objects.first()
                if not category:
                    category = Category.objects.create(name="General", description="General Category")

            raw_price = data.get('price') or data.get('current_price') or data.get('currentPrice') or '0.00'
            raw_stock = data.get('stockQuantity') if data.get('stockQuantity') is not None else (data.get('stock') if data.get('stock') is not None else 10)
            raw_score = data.get('sustainabilityScore') or data.get('sustainability_score') or 85.0
            raw_image = sanitize_image_url(data.get('image_url') or data.get('imageUrl') or '')
            raw_sku = data.get('sku', '').strip()
            raw_status = (data.get('status') or 'ACTIVE').upper()
            raw_whitelisted = bool(data.get('is_whitelisted') or data.get('isWhitelisted') or False)

            additional_images_raw = data.get('additional_images') or data.get('additionalImages') or []
            additional_images_clean = sanitize_image_list(additional_images_raw)

            # Process tags
            raw_tags = data.get('tags', ['sustainable', 'eco-friendly'])
            if isinstance(raw_tags, str):
                tags_list = [t.strip() for t in raw_tags.split(',') if t.strip()]
            elif isinstance(raw_tags, list):
                tags_list = [str(t).strip() for t in raw_tags if str(t).strip()]
            else:
                tags_list = ['sustainable', 'eco-friendly']

            if raw_sku and f"SKU:{raw_sku}" not in tags_list and raw_sku not in tags_list:
                tags_list.insert(0, f"SKU:{raw_sku}")

            image_features = {
                'additional_images': additional_images_clean
            }

            product = Product.objects.create(
                name=data.get('name', '').strip(),
                description=data.get('description', '').strip(),
                category=category,
                current_price=Decimal(str(raw_price)),
                image_url=raw_image,
                image_features=image_features,
                stock=int(raw_stock),
                status=raw_status,
                is_whitelisted=raw_whitelisted,
                sustainability_score=float(raw_score),
                popularity_score=float(data.get('popularity_score', 5.0)),
                tags=tags_list
            )
            
            # Link PriceHistory initial entry
            PriceHistory.objects.create(
                product=product,
                price=product.current_price,
                date=timezone.now().date()
            )
            
            # Associate Taxonomies (AgeGroup, GenderCategory, EcoTag)
            cat_name_lower = category.name.lower()
            prod_name_lower = product.name.lower()

            if 'kid' in cat_name_lower or 'kid' in prod_name_lower or any('kid' in str(t).lower() for t in tags_list):
                kids_group, _ = AgeGroup.objects.get_or_create(name='Kids')
                product.age_groups.add(kids_group)

            if 'teen' in cat_name_lower or 'teen' in prod_name_lower or any('teen' in str(t).lower() for t in tags_list):
                teens_group, _ = AgeGroup.objects.get_or_create(name='Teens')
                product.age_groups.add(teens_group)

            if 'women' in cat_name_lower or 'women' in prod_name_lower or any('women' in str(t).lower() for t in tags_list):
                women_cat, _ = GenderCategory.objects.get_or_create(name='Women')
                product.gender_categories.add(women_cat)
            elif 'men' in cat_name_lower or 'men' in prod_name_lower or any('men' in str(t).lower() for t in tags_list):
                men_cat, _ = GenderCategory.objects.get_or_create(name='Men')
                product.gender_categories.add(men_cat)

            if 'unisex' in cat_name_lower or 'unisex' in prod_name_lower or any('unisex' in str(t).lower() for t in tags_list):
                unisex_cat, _ = GenderCategory.objects.get_or_create(name='Unisex')
                product.gender_categories.add(unisex_cat)

            if 'eco_tags' in data and isinstance(data['eco_tags'], list):
                product.eco_tags.set(data['eco_tags'])
                
            if 'age_groups' in data and isinstance(data['age_groups'], list):
                product.age_groups.set(data['age_groups'])
                
            if 'gender_categories' in data and isinstance(data['gender_categories'], list):
                product.gender_categories.set(data['gender_categories'])
                
            return Response({
                'status': 'success',
                'message': 'Product created successfully',
                'product': ProductSerializer(product).data,
                'data': ProductSerializer(product).data
            }, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({'status': 'error', 'message': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrInternalService])
def admin_product_detail(request, pk):
    """
    GET, PUT, PATCH, DELETE operations for single product.
    DELETE soft-archives by default, or physically deletes if hard=true.
    """
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'status': 'error', 'message': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'GET':
        return Response({'status': 'success', 'product': ProductSerializer(product).data, 'data': ProductSerializer(product).data})
        
    elif request.method in ['PUT', 'PATCH']:
        data = request.data
        if 'name' in data:
            product.name = data['name']
        if 'description' in data:
            product.description = data['description']
        
        cat_val = data.get('category') or data.get('categoryId') or data.get('category_id')
        if cat_val is not None:
            if isinstance(cat_val, int) or (isinstance(cat_val, str) and cat_val.isdigit()):
                cat_obj = Category.objects.filter(id=int(cat_val)).first()
                if cat_obj:
                    product.category = cat_obj
            elif isinstance(cat_val, str) and cat_val.strip():
                cat_obj, _ = Category.objects.get_or_create(name=cat_val.strip())
                product.category = cat_obj

        if 'stock' in data or 'stockQuantity' in data:
            product.stock = int(data.get('stock') if data.get('stock') is not None else data.get('stockQuantity', 0))
        if 'image_url' in data or 'imageUrl' in data:
            product.image_url = sanitize_image_url(data.get('image_url') or data.get('imageUrl'))
        if 'additional_images' in data or 'additionalImages' in data:
            add_imgs = sanitize_image_list(data.get('additional_images') or data.get('additionalImages'))
            features = product.image_features or {}
            features['additional_images'] = add_imgs
            product.image_features = features
        if 'sustainability_score' in data or 'sustainabilityScore' in data:
            product.sustainability_score = float(data.get('sustainability_score') or data.get('sustainabilityScore', 80))
        if 'popularity_score' in data:
            product.popularity_score = float(data['popularity_score'])

        # Whitelist and Archive status support
        if 'is_whitelisted' in data or 'isWhitelisted' in data:
            product.is_whitelisted = bool(data.get('is_whitelisted') if 'is_whitelisted' in data else data.get('isWhitelisted'))
        if 'status' in data:
            product.status = str(data['status']).upper()
        if 'is_archived' in data or 'isArchived' in data:
            archived = bool(data.get('is_archived') if 'is_archived' in data else data.get('isArchived'))
            product.status = 'ARCHIVED' if archived else 'ACTIVE'

        if 'tags' in data:
            raw_tags = data['tags']
            if isinstance(raw_tags, str):
                product.tags = [t.strip() for t in raw_tags.split(',') if t.strip()]
            elif isinstance(raw_tags, list):
                product.tags = [str(t).strip() for t in raw_tags if str(t).strip()]

        raw_sku = data.get('sku', '').strip()
        if raw_sku:
            if isinstance(product.tags, list):
                if f"SKU:{raw_sku}" not in product.tags and raw_sku not in product.tags:
                    product.tags.insert(0, f"SKU:{raw_sku}")
            
        if 'current_price' in data or 'price' in data or 'currentPrice' in data:
            new_price = Decimal(str(data.get('price') or data.get('current_price') or data.get('currentPrice')))
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

        # Taxonomy sync
        cat_name_lower = product.category.name.lower() if product.category else ''
        prod_name_lower = product.name.lower()
        tags_str = ' '.join(product.tags) if isinstance(product.tags, list) else ''

        if 'kid' in cat_name_lower or 'kid' in prod_name_lower or 'kid' in tags_str.lower():
            kids_group, _ = AgeGroup.objects.get_or_create(name='Kids')
            product.age_groups.add(kids_group)
        if 'teen' in cat_name_lower or 'teen' in prod_name_lower or 'teen' in tags_str.lower():
            teens_group, _ = AgeGroup.objects.get_or_create(name='Teens')
            product.age_groups.add(teens_group)

        return Response({'status': 'success', 'message': 'Product updated', 'product': ProductSerializer(product).data, 'data': ProductSerializer(product).data})
        
    elif request.method == 'DELETE':
        hard_delete = request.GET.get('hard', '').lower() in ['true', '1']
        if hard_delete:
            product_name = product.name
            product.delete()
            return Response({'status': 'success', 'message': f"Product '{product_name}' deleted permanently"})
        else:
            # Soft-archive by default
            product.status = 'ARCHIVED'
            product.save(update_fields=['status', 'updated_at'])
            return Response({
                'status': 'success',
                'message': f"Product '{product.name}' archived successfully",
                'product': ProductSerializer(product).data,
                'data': ProductSerializer(product).data
            })


@api_view(['POST', 'PATCH'])
@permission_classes([IsAdminOrInternalService])
def admin_product_whitelist_toggle(request, pk):
    """
    Toggles or sets the whitelist state of a product.
    Persists directly to database (is_whitelisted boolean).
    """
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'status': 'error', 'message': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    req_data = request.data if isinstance(request.data, dict) else {}
    if 'is_whitelisted' in req_data:
        target_state = bool(req_data['is_whitelisted'])
    elif 'isWhitelisted' in req_data:
        target_state = bool(req_data['isWhitelisted'])
    else:
        target_state = not product.is_whitelisted

    product.is_whitelisted = target_state
    product.save(update_fields=['is_whitelisted', 'updated_at'])

    return Response({
        'status': 'success',
        'message': f"Product '{product.name}' whitelist status updated to {target_state}",
        'is_whitelisted': product.is_whitelisted,
        'isWhitelisted': product.is_whitelisted,
        'product': ProductSerializer(product).data,
        'data': ProductSerializer(product).data
    })


@api_view(['POST', 'PATCH'])
@permission_classes([IsAdminOrInternalService])
def admin_product_archive_toggle(request, pk):
    """
    Archives or unarchives a product (soft status update).
    Persists status='ARCHIVED' or status='ACTIVE' in database.
    """
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'status': 'error', 'message': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    req_data = request.data if isinstance(request.data, dict) else {}
    if 'archive' in req_data:
        should_archive = bool(req_data['archive'])
    elif 'status' in req_data:
        should_archive = str(req_data['status']).upper() == 'ARCHIVED'
    else:
        should_archive = (product.status != 'ARCHIVED')

    product.status = 'ARCHIVED' if should_archive else 'ACTIVE'
    product.save(update_fields=['status', 'updated_at'])

    action_label = "archived" if should_archive else "restored"
    return Response({
        'status': 'success',
        'message': f"Product '{product.name}' {action_label} successfully",
        'status_code': product.status,
        'product': ProductSerializer(product).data,
        'data': ProductSerializer(product).data
    })


@api_view(['POST', 'PATCH'])
@permission_classes([IsAdminOrInternalService])
def admin_product_restore(request, pk):
    """
    Restores an archived product back to ACTIVE status.
    """
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'status': 'error', 'message': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    product.status = 'ACTIVE'
    product.save(update_fields=['status', 'updated_at'])

    return Response({
        'status': 'success',
        'message': f"Product '{product.name}' restored to active catalog",
        'product': ProductSerializer(product).data,
        'data': ProductSerializer(product).data
    })


@api_view(['GET'])
@permission_classes([IsAdminOrInternalService])
def admin_product_image_search(request):
    """
    Universal Image Search for product catalog management across all categories.
    Queries database-backed products with valid images - no hardcoded static images.
    """
    raw_query = request.GET.get('query') or request.GET.get('q') or ''
    category_name = request.GET.get('category') or request.GET.get('categoryName') or ''

    clean_query = raw_query.strip().lower()
    clean_cat = category_name.strip().lower()

    qs = Product.objects.filter(image_url__isnull=False).exclude(image_url='').exclude(status='ARCHIVED')
    if clean_query:
        qs = qs.filter(Q(name__icontains=clean_query) | Q(description__icontains=clean_query) | Q(tags__icontains=clean_query))
    if clean_cat:
        qs = qs.filter(category__name__icontains=clean_cat)

    results = []
    for p in qs[:20]:
        results.append({
            'title': p.name,
            'imageUrl': p.image_url,
            'thumbnailUrl': p.image_url,
            'source': 'Database Catalog',
            'category': p.category.name if p.category else 'Catalog'
        })

    return Response({
        'status': 'success',
        'query': raw_query,
        'category': category_name,
        'count': len(results),
        'results': results
    })


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
        clean_id = (
            search.replace('ORD-', '')
            .replace('ord-', '')
            .replace('ORD', '')
            .replace('ord', '')
            .replace('#', '')
            .strip()
            .lstrip('0') or '0'
        )
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
    Retrieve single order by ID or order_number with complete details, items, payment, timeline, and history.
    """
    pk_str = str(pk).strip()
    qs = Order.objects.select_related('user').prefetch_related('items__product', 'status_history')
    order = qs.filter(order_number__iexact=pk_str).first()
    if not order and pk_str.isdigit():
        order = qs.filter(pk=int(pk_str)).first()
    if not order:
        return Response({'status': 'error', 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'status': 'success', 'order': OrderSerializer(order).data, 'data': OrderSerializer(order).data})


@api_view(['PATCH', 'POST', 'PUT'])
@permission_classes([IsAdminOrInternalService])
def admin_order_status_update(request, order_id):
    """
    Update order status with lifecycle validation, carrier/tracking attribution,
    audit history recording, customer email/SMS notifications, and event streaming.
    """
    order_str = str(order_id).strip()
    order = Order.objects.filter(order_number__iexact=order_str).first()
    if not order and order_str.isdigit():
        order = Order.objects.filter(pk=int(order_str)).first()
    if not order:
        return Response({'status': 'error', 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
    req_data = request.data if isinstance(request.data, dict) else {}
    raw_new_status = req_data.get('status') or req_data.get('newStatus') or request.query_params.get('status') or request.GET.get('status') or request.POST.get('status')
    if not raw_new_status and request.body:
        try:
            import json
            b_data = json.loads(request.body.decode('utf-8'))
            if isinstance(b_data, dict):
                req_data = b_data
                raw_new_status = b_data.get('status') or b_data.get('newStatus')
        except Exception:
            pass

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

    ALLOWED_STATE_TRANSITIONS = {
        'ORDER_PLACED': ['ORDER_CONFIRMED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'CANCELLED'],
        'ORDER_CONFIRMED': ['PROCESSING', 'PACKED', 'SHIPPED', 'CANCELLED'],
        'PROCESSING': ['PACKED', 'SHIPPED', 'CANCELLED'],
        'PACKED': ['SHIPPED', 'IN_TRANSIT', 'CANCELLED'],
        'SHIPPED': ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'CANCELLED'],
        'IN_TRANSIT': ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
        'OUT_FOR_DELIVERY': ['DELIVERED', 'CANCELLED'],
        'DELIVERED': [],
        'CANCELLED': [],
        'REFUNDED': []
    }

    is_internal_call = (
        request.headers.get('X-Internal-Service-Key') == 'econext-internal-microservice-key-2026'
        or getattr(request, 'is_internal_service', False)
    )

    # SECURITY ENFORCEMENT: DELIVERED cannot be set directly from admin without OTP verification or internal sync
    if target_canonical == 'DELIVERED' and not is_internal_call:
        has_delivery_audit = order.delivery_audits.filter(new_status='DELIVERED').exists()
        if not has_delivery_audit:
            return Response({
                'status': 'error',
                'message': 'Direct transition to DELIVERED is forbidden. Secure Customer Delivery OTP verification is required.'
            }, status=status.HTTP_400_BAD_REQUEST)

    allowed_targets = ALLOWED_STATE_TRANSITIONS.get(curr_canonical, [])
    # Check if transition is allowed (unless authoritative internal sync)
    if not is_internal_call and target_canonical not in allowed_targets and target_canonical != curr_canonical:
        return Response({
            'status': 'error',
            'message': f"Invalid state transition from {curr_canonical} to {target_canonical}. Allowed next states: {', '.join(allowed_targets) if allowed_targets else 'None (Terminal state)'}"
        }, status=status.HTTP_400_BAD_REQUEST)

    old_status = order.status
    note = req_data.get('reasonNote') or req_data.get('note', '')
    carrier_name = req_data.get('carrierName') or req_data.get('carrier_name') or order.carrier_name
    tracking_number = req_data.get('trackingNumber') or req_data.get('tracking_number') or order.tracking_number
    shipment_number = req_data.get('shipmentNumber') or req_data.get('shipment_number')
    payment_status_param = req_data.get('paymentStatus') or req_data.get('payment_status')

    order.status = target_canonical
    if target_canonical == 'DELIVERED' and not order.delivered_at:
        order.delivered_at = timezone.now()
    if carrier_name:
        order.carrier_name = carrier_name
    if tracking_number:
        order.tracking_number = tracking_number
    if payment_status_param:
        order.payment_status = payment_status_param.upper()
    elif target_canonical == 'DELIVERED' and str(order.payment_method).lower() == 'cod':
        order.payment_status = 'PAID'
    order.save()

    # Synchronize or create linked shipment record
    if shipment_number:
        from order_service.models import Shipment
        shp, created = Shipment.objects.get_or_create(
            order=order,
            shipment_number=shipment_number,
            defaults={
                'status': target_canonical,
                'carrier_name': carrier_name or 'EcoExpress',
                'tracking_number': tracking_number or '',
                'destination': f"{order.city}, {order.state}".strip(', ')
            }
        )
        shp.status = target_canonical
        if carrier_name:
            shp.carrier_name = carrier_name
        if tracking_number:
            shp.tracking_number = tracking_number
        if target_canonical == 'DELIVERED' and not shp.delivered_at:
            shp.delivered_at = timezone.now()
        shp.save()

    # Synchronize all linked shipments if any exist
    if hasattr(order, 'shipments'):
        for shp in order.shipments.all():
            shp.status = target_canonical
            if carrier_name:
                shp.carrier_name = carrier_name
            if tracking_number:
                shp.tracking_number = tracking_number
            if target_canonical == 'DELIVERED' and not shp.delivered_at:
                shp.delivered_at = timezone.now()
            shp.save()

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
