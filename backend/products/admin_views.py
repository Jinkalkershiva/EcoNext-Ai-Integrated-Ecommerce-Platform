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
    GET: List all products with filtering, search, stock levels.
    POST: Create a new product with flexible DTO field mapping and taxonomy linking.
    """
    if request.method == 'GET':
        qs = Product.objects.select_related('category', 'subcategory', 'season', 'occasion').prefetch_related('eco_tags', 'age_groups', 'gender_categories').all()
        
        search = request.GET.get('search', '').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
            
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
        product_name = product.name
        product.delete()
        return Response({'status': 'success', 'message': f"Product '{product_name}' deleted successfully"})


@api_view(['GET'])
@permission_classes([IsAdminOrInternalService])
def admin_product_image_search(request):
    """
    Universal Image Search for product catalog management across all categories.
    Accepts query/q and category/categoryName.
    Returns high-resolution sustainable product photography matches.
    """
    raw_query = request.GET.get('query') or request.GET.get('q') or ''
    category_name = request.GET.get('category') or request.GET.get('categoryName') or ''

    clean_query = raw_query.strip().lower()
    clean_cat = category_name.strip().lower()
    combined = f"{clean_query} {clean_cat}".strip()

    curated_catalog = [
        # Apparel & Clothing
        {"title": "Organic Cotton Crewneck T-Shirt", "imageUrl": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Apparel & Clothing"},
        {"title": "Sustainable Linen Summer Dress", "imageUrl": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Apparel & Clothing"},
        {"title": "Recycled Wool Winter Jacket", "imageUrl": "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Apparel & Clothing"},
        {"title": "Eco Hemp Casual Shirt", "imageUrl": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Apparel & Clothing"},
        {"title": "Organic Denim Jeans", "imageUrl": "https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Apparel & Clothing"},

        # Footwear
        {"title": "Recycled Ocean Plastic Sneakers", "imageUrl": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Footwear"},
        {"title": "Natural Cork Sole Casual Shoes", "imageUrl": "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Footwear"},
        {"title": "Eco-friendly Trail Running Shoes", "imageUrl": "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Footwear"},
        {"title": "Organic Canvas Slip-on Shoes", "imageUrl": "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Footwear"},

        # Home & Living / Kitchen
        {"title": "Handmade Bamboo Kitchen Storage Box", "imageUrl": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Home & Living"},
        {"title": "Reusable Ceramic Coffee Mug", "imageUrl": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Home & Living"},
        {"title": "Stainless Steel Insulated Water Bottle", "imageUrl": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Home & Living"},
        {"title": "Coconut Bowl & Wooden Cutlery Set", "imageUrl": "https://images.unsplash.com/photo-1546938576-6e6a64f317cc?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1546938576-6e6a64f317cc?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Home & Living"},

        # Bags & Travel Gear
        {"title": "Recycled Canvas Everyday Backpack", "imageUrl": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Bags & Travel Gear"},
        {"title": "Organic Cotton Grocery Tote Bag", "imageUrl": "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Bags & Travel Gear"},
        {"title": "Upcycled Waterproof Duffle Bag", "imageUrl": "https://images.unsplash.com/photo-1501554728187-ce583db33af7?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1501554728187-ce583db33af7?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Bags & Travel Gear"},

        # Personal Care & Beauty
        {"title": "Natural Organic Botanical Face Serum", "imageUrl": "https://images.unsplash.com/photo-1608248597359-009772a5a58d?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1608248597359-009772a5a58d?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Personal Care"},
        {"title": "Ayurvedic Herbal Shampoo & Conditioner", "imageUrl": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Personal Care"},
        {"title": "Zero-Waste Bamboo Toothbrush Set", "imageUrl": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Personal Care"},
        {"title": "Organic Moisturizing Body Cream", "imageUrl": "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Personal Care"},

        # Eco Accessories & Lifestyle
        {"title": "Handmade Bamboo Polarized Sunglasses", "imageUrl": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Eco Accessories"},
        {"title": "Recycled Cork Cardholder Wallet", "imageUrl": "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Eco Accessories"},

        # Kids & Teens
        {"title": "Organic Bamboo Cotton Kids Romper", "imageUrl": "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Kids"},
        {"title": "Natural Wooden Building Blocks Toy", "imageUrl": "https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Kids"},

        # Fitness & Outdoors
        {"title": "Natural Tree Rubber Yoga Mat", "imageUrl": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Fitness & Sports"},
        {"title": "Eco-Friendly Resistance Bands Set", "imageUrl": "https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Fitness & Sports"},

        # Groceries & Food
        {"title": "Organic Fair Trade Ground Coffee", "imageUrl": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Groceries"},
        {"title": "Artisanal Himalayan Green Tea", "imageUrl": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80", "thumbnailUrl": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=80", "source": "Unsplash Curated", "category": "Groceries"}
    ]

    keywords = [k for k in combined.split() if k]
    results = []

    if keywords:
        for item in curated_catalog:
            item_text = f"{item['title']} {item['category']}".lower()
            if any(k in item_text for k in keywords):
                results.append(item)
    else:
        results = list(curated_catalog)

    if len(results) < 4:
        for item in curated_catalog:
            if item not in results:
                results.append(item)
            if len(results) >= 8:
                break

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
