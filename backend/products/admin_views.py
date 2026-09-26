"""
Admin Panel REST Endpoints for EcoNext.
Protected by Role-Based Access Control (RBAC): requires is_staff or is_superuser.
"""

from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from products.models import (
    Product, Category, SubCategory, AgeGroup, GenderCategory,
    EcoTag, Season, Occasion, PriceHistory
)
from products.serializers import ProductSerializer, CategorySerializer
from order_service.models import Order, OrderItem
from accounts.serializers import UserSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
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
@permission_classes([IsAuthenticated, IsAdminUser])
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
@permission_classes([IsAuthenticated, IsAdminUser])
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
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_orders_list(request):
    """
    List all orders with detailed customer and shipping information.
    """
    orders = Order.objects.select_related('user').prefetch_related('items__product').all()
    
    status_filter = request.GET.get('status')
    if status_filter:
        orders = orders.filter(status=status_filter)
        
    results = []
    for o in orders:
        items_data = [
            {
                'id': item.id,
                'product_id': item.product.id,
                'product_name': item.product.name,
                'quantity': item.quantity,
                'price': float(item.price_at_purchase),
                'subtotal': float(item.get_subtotal())
            }
            for item in o.items.all()
        ]
        results.append({
            'id': o.id,
            'customer': {
                'id': o.user.id,
                'username': o.user.username,
                'name': f"{o.user.first_name} {o.user.last_name}".strip() or o.user.username,
                'email': o.user.email
            },
            'status': o.status,
            'total_price': float(o.total_price),
            'shipping_address': {
                'address': o.shipping_address,
                'city': o.city,
                'state': o.state,
                'zipcode': o.zipcode,
                'country': o.country
            },
            'items': items_data,
            'items_count': len(items_data),
            'created_at': o.created_at.strftime('%Y-%m-%d %H:%M'),
            'updated_at': o.updated_at.strftime('%Y-%m-%d %H:%M')
        })
        
    return Response({'status': 'success', 'count': len(results), 'orders': results, 'data': results})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_order_status_update(request, order_id):
    """
    Update order status (e.g. pending -> confirmed -> shipped -> delivered).
    """
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response({'status': 'error', 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
    new_status = request.data.get('status')
    valid_statuses = dict(Order.STATUS_CHOICES).keys()
    if new_status not in valid_statuses:
        return Response({'status': 'error', 'message': f"Invalid status. Choose from: {list(valid_statuses)}"}, status=status.HTTP_400_BAD_REQUEST)
        
    order.status = new_status
    order.save()
    return Response({'status': 'success', 'message': f"Order #{order.id} status updated to {new_status}", 'status_value': new_status})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_users_list(request):
    """
    List all platform users with roles and order histories.
    """
    users = User.objects.prefetch_related('orders', 'profile').all().order_by('-date_joined')
    results = []
    for u in users:
        results.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'is_staff': u.is_staff,
            'is_superuser': u.is_superuser,
            'role': 'admin' if (u.is_staff or u.is_superuser) else 'user',
            'orders_count': u.orders.count(),
            'date_joined': u.date_joined.strftime('%Y-%m-%d %H:%M')
        })
    return Response({'status': 'success', 'count': len(results), 'users': results})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
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
