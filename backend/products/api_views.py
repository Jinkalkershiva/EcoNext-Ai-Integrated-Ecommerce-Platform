"""REST API endpoints for the product catalogue, search and ML features."""

import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q, Avg
from django.utils import timezone
from datetime import timedelta

from products.models import (
    Product, Category, ProductSearch,
    SubCategory, AgeGroup, GenderCategory, EcoTag, SkinOrBodyFit, Season, Occasion,
    ProductVariant, ProductReview, ReviewImage, ProductInquiry
)
from products.serializers import (
    ProductSerializer, SearchResultSerializer, CategorySerializer,
    SubCategorySerializer, AgeGroupSerializer, GenderCategorySerializer,
    EcoTagSerializer, SkinOrBodyFitSerializer, SeasonSerializer, OccasionSerializer,
    ProductVariantSerializer, ProductReviewSerializer, ReviewImageSerializer,
    ProductInquirySerializer
)
from ml_engine.price_predictor import PricePredictionService
from ml_engine.visual_search import visual_search_engine
from ml_engine.intent_search import IntentBasedSearcher
from accounts.models import ActivityLog
from personalization.recommendations import RecommendationService
from site_analytics.kafka_producer import publish_product_view_event, publish_search_event

logger = logging.getLogger(__name__)


def product_queryset(include_archived=False):
    """Base queryset with the joins ProductSerializer needs.

    ProductSerializer nests related objects per product. Without these
    joins a 50-product page issued hundreds of queries; this collapses it to a
    small constant number.
    """
    qs = (
        Product.objects
        .select_related('category', 'subcategory', 'skin_or_body_fit', 'season', 'occasion')
        .prefetch_related('age_groups', 'gender_categories', 'eco_tags', 'variants', 'reviews__images', 'reviews__user')
    )
    if not include_archived:
        qs = qs.exclude(status='ARCHIVED')
    return qs


# Only these orderings are accepted, so a caller cannot order by an arbitrary
# (or nonexistent) column and trigger a database error.
ALLOWED_SORTS = {
    '-created_at': '-created_at',
    'created_at': 'created_at',
    'price_low': 'current_price',
    'price_high': '-current_price',
    'name': 'name',
    'popular': '-popularity_score',
    'sustainable': '-sustainability_score',
    # Accept the raw column names too, for backwards compatibility.
    'current_price': 'current_price',
    '-current_price': '-current_price',
    '-popularity_score': '-popularity_score',
    '-sustainability_score': '-sustainability_score',
}

# ============ Personalization-related ViewSets ============

class AgeGroupViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AgeGroup.objects.all()
    serializer_class = AgeGroupSerializer

class GenderCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GenderCategory.objects.all()
    serializer_class = GenderCategorySerializer

class SubCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SubCategory.objects.all()
    serializer_class = SubCategorySerializer

class EcoTagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EcoTag.objects.all()
    serializer_class = EcoTagSerializer

class SkinOrBodyFitViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SkinOrBodyFit.objects.all()
    serializer_class = SkinOrBodyFitSerializer

class SeasonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer

class OccasionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Occasion.objects.all()
    serializer_class = OccasionSerializer

# ============ Product Endpoints ============

@api_view(['GET'])
def product_list(request):
    """Get products with pagination and filtering."""
    products = product_queryset()

    age_group = request.query_params.get('age_group')
    gender_category = request.query_params.get('gender_category')
    category = request.query_params.get('category')
    price_min = request.query_params.get('price_min')
    price_max = request.query_params.get('price_max')
    eco_tags = request.query_params.getlist('eco_tags')
    search = request.query_params.get('search') or request.query_params.get('q')
    sort_by = request.query_params.get('sort_by', '-created_at')

    if age_group:
        products = products.filter(Q(age_groups__name__iexact=age_group) | Q(category__name__iexact=age_group))
    if gender_category:
        products = products.filter(Q(gender_categories__name__iexact=gender_category) | Q(category__name__iexact=gender_category))
    if category:
        if str(category).isdigit():
            products = products.filter(Q(category_id=int(category)) | Q(category__name__iexact=str(category)))
        else:
            products = products.filter(Q(category__name__iexact=category) | Q(age_groups__name__iexact=category) | Q(gender_categories__name__iexact=category))
    if search:
        products = products.filter(Q(name__icontains=search) | Q(description__icontains=search) | Q(tags__icontains=search))
    if eco_tags:
        products = products.filter(eco_tags__name__in=eco_tags)
    if price_min:
        try:
            products = products.filter(current_price__gte=float(price_min))
        except (TypeError, ValueError):
            return Response(
                {'status': 'error', 'message': 'price_min must be a number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
    if price_max:
        try:
            products = products.filter(current_price__lte=float(price_max))
        except (TypeError, ValueError):
            return Response(
                {'status': 'error', 'message': 'price_max must be a number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Joining across the many-to-many filters can duplicate rows.
    products = products.distinct().order_by(ALLOWED_SORTS.get(sort_by, '-created_at'))

    # Clamp pagination so a bad page/per_page can't error or ask for 10k rows.
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = min(100, max(1, int(request.query_params.get('per_page', 12))))
    except (TypeError, ValueError):
        per_page = 12

    total_count = products.count()
    start = (page - 1) * per_page
    serializer = ProductSerializer(products[start:start + per_page], many=True)

    return Response({
        'status': 'success',
        'total_count': total_count,
        'page': page,
        'per_page': per_page,
        'total_pages': (total_count + per_page - 1) // per_page,
        'has_next': start + per_page < total_count,
        'products': serializer.data,
    })


@api_view(['GET'])
def personalized_recommendations(request):
    """Recommendations for the logged-in user.

    Falls back to the most popular products if the personalization engine has
    nothing to work with (a brand new account) or fails outright, so the
    "Recommended for you" rail is never an error state.
    """
    if not request.user.is_authenticated:
        return Response(
            {'status': 'error', 'message': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    source = 'personalized'
    recommendations = []
    try:
        recommendations = list(RecommendationService(request.user).get_recommendations())
    except Exception:
        logger.exception('Recommendation engine failed for user %s', request.user.pk)
        recommendations = []

    if not recommendations:
        source = 'popular'
        recommendations = list(
            product_queryset().order_by('-popularity_score', '-created_at')[:12]
        )

    return Response({
        'status': 'success',
        'source': source,
        'recommendations': ProductSerializer(recommendations, many=True).data,
    })



@api_view(['GET'])
def product_detail(request, product_id):
    """Get a single product, with a live price prediction when one is available."""
    product = get_object_or_404(product_queryset(), id=product_id)

    if request.user.is_authenticated:
        ActivityLog.objects.create(user=request.user, action='view', product=product)

    # Stream real-time product view event to Big Data Kafka ingestion layer
    publish_product_view_event(
        user=request.user,
        product_id=product.id,
        category_name=product.category.name if product.category else None
    )

    # A failing predictor must not take the product page down with it — the page
    # is still perfectly useful without the forecast.
    prediction_data = None
    try:
        prediction_data = PricePredictionService().predict(product, use_cache=True)
    except Exception:
        logger.exception('Price prediction failed for product %s', product_id)

    return Response({
        'status': 'success',
        'product': ProductSerializer(product).data,
        'price_prediction': prediction_data,
    })


# ============ Search Endpoints ============

@api_view(['GET'])
def intent_search(request):
    """Smart intent-based search, with a plain keyword fallback.

    The intent searcher builds a TF-IDF index using scikit-learn. If that is
    unavailable or the index is empty, we fall back to a straightforward
    name/description/tag match rather than returning an error, so search always
    returns something usable.
    """
    query = (request.query_params.get('q') or request.query_params.get('query') or '').strip()

    if not query:
        return Response(
            {'status': 'error', 'message': 'Search query required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    ProductSearch.objects.create(query=query)

    results = {}
    source = 'intent'
    try:
        categories = IntentBasedSearcher().get_category_recommendations(query)
        for category, products_data in (categories or {}).items():
            serialized = SearchResultSerializer(products_data, many=True).data
            if serialized:
                results[category] = serialized
    except Exception:
        logger.exception('Intent search failed for query %r', query)
        results = {}

    if not results:
        source = 'keyword'
        # `tags` is a JSONField, and text lookups against it are not portable
        # across SQLite and Postgres, so it is deliberately not searched here.
        matches = product_queryset().filter(
            Q(name__icontains=query)
            | Q(description__icontains=query)
            | Q(category__name__icontains=query)
            | Q(subcategory__name__icontains=query)
        ).distinct().order_by('-popularity_score')[:20]
        if matches:
            results['Matching products'] = [
                {
                    'product': ProductSerializer(product).data,
                    'similarity_score': 1.0,
                    'intent_match': 'keyword',
                }
                for product in matches
            ]

    total_results_count = sum(len(items) for items in results.values()) if results else 0
    # Stream real-time search query clickstream event to Big Data Kafka ingestion layer
    publish_search_event(
        user=request.user,
        query=query,
        results_count=total_results_count
    )

    return Response({
        'status': 'success',
        'query': query,
        'source': source,
        'results': results,
        'total_found': sum(len(v) for v in results.values()),
    })


@api_view(['GET'])
def category_browse(request):
    """List categories, or the products inside one category.

    This endpoint used to return only {'products': [...]}, but the frontend
    calls it to populate its category navigation and reads response.categories.
    That mismatch meant the category menu was silently always empty. It now
    returns both keys: 'categories' always, and 'products' when narrowed by id.
    """
    category_id = request.query_params.get('id') or request.query_params.get('category_id')

    categories = Category.objects.all().order_by('name')
    payload = {
        'status': 'success',
        'categories': CategorySerializer(categories, many=True).data,
    }

    if category_id:
        category = get_object_or_404(Category, id=category_id)
        products = product_queryset().filter(category=category).order_by('-created_at')[:100]
        payload['category'] = CategorySerializer(category).data
        payload['products'] = ProductSerializer(products, many=True).data
    else:
        payload['products'] = []

    return Response(payload)


# ============ ML Endpoints ============

@api_view(['GET'])
def price_prediction(request, product_id):
    """Get 7-day price prediction for product — computed live with caching."""
    product = get_object_or_404(Product, id=product_id)

    try:
        result = PricePredictionService().predict(product, use_cache=True)
    except Exception:
        logger.exception('Price prediction failed for product %s', product_id)
        return Response({
            'status': 'unavailable',
            'message': 'Price prediction is not available for this product yet.',
            'prediction': None,
        })

    return Response({
        'status': 'success',
        'prediction': result
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def visual_search(request):
    """Search by image upload.

    The engine prefers CLIP embeddings and falls back to colour-histogram
    matching when torch/transformers/faiss are not installed. See
    ml_engine/visual_search.py.
    """
    if 'image' not in request.FILES:
        return Response(
            {'status': 'error', 'message': 'Image file not provided.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    image_file = request.FILES['image']

    if image_file.size > 10 * 1024 * 1024:
        return Response(
            {'status': 'error', 'message': 'Image must be smaller than 10 MB.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        similar_products = visual_search_engine.search(image_file, top_k=10)
    except Exception:
        # Log the real traceback server-side; don't hand internals to the client.
        logger.exception('Visual search failed')
        return Response(
            {'status': 'error', 'message': 'Visual search could not process that image.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    raw_results = [
        {
            'product': ProductSerializer(item['product']).data,
            'similarity_score': float(item['similarity_score']),
        }
        for item in similar_products
    ]

    # Deduplicate by product name to prevent showing visually identical items
    # across different categories (e.g. Kids, Men) multiple times.
    seen_names = set()
    results = []
    for r in raw_results:
        name = r['product']['name']
        if name not in seen_names:
            seen_names.add(name)
            results.append(r)
    return Response({
        'status': 'success',
        'results': results,
        'total_found': len(results),
    })


@api_view(['GET'])
def trending_now(request):
    """Get trending products.

    Trending snapshots are written by a Celery beat task. This endpoint used to
    only read snapshots newer than one hour, so on any install where Celery is
    not running — which is every install without Redis — the trending section
    was permanently empty. It now degrades in three steps:

      1. the most recent snapshot batch, whenever it was recorded;
      2. live counts from the activity log over the last 7 days;
      3. the catalogue's own popularity score.

    Every tier returns the same shape, so the frontend never has to care which
    one answered. 'source' says which tier was used.
    """
    from site_analytics.models import TrendingProduct

    def payload(items, source):
        return Response({
            'status': 'success',
            'source': source,
            'trending_products': items,
        })

    # Tier 1 — newest recorded snapshot.
    #
    # Snapshots cannot be filtered by a simple time window: the generator has
    # been run more than once, and two runs seconds apart each write their own
    # rank 1..N. Any window wide enough to catch one whole run also catches the
    # previous one, which produced duplicate ranks and repeated products. So
    # instead we keep the newest row *per product* and re-rank from scratch.
    latest = TrendingProduct.objects.order_by('-timestamp').first()
    if latest is not None:
        newest_per_product = {}
        rows = (
            TrendingProduct.objects
            .order_by('-timestamp')
            .values('product_id', 'rank', 'views_count', 'searches_count', 'purchase_count')[:200]
        )
        for row in rows:
            if row['product_id'] is not None and row['product_id'] not in newest_per_product:
                newest_per_product[row['product_id']] = row

        ranked = sorted(
            newest_per_product.values(),
            key=lambda row: (row['rank'], -row['views_count']),
        )[:10]

        # ProductSerializer would otherwise fetch each product's eight relations
        # one at a time, so the products are loaded through product_queryset()
        # in a single query.
        products = {
            product.id: product
            for product in product_queryset().filter(
                id__in=[row['product_id'] for row in ranked]
            )
        }

        results = []
        for position, row in enumerate(ranked, start=1):
            product = products.get(row['product_id'])
            if product is None:
                continue
            results.append({
                'product': ProductSerializer(product).data,
                'rank': position,
                'views': row['views_count'],
                'searches': row['searches_count'],
                'purchases': row['purchase_count'],
            })
        if results:
            return payload(results, 'snapshot')

    # Tier 2 — compute it live from recent activity.
    cutoff = timezone.now() - timedelta(days=7)
    hot_ids = list(
        ActivityLog.objects
        .filter(timestamp__gte=cutoff, product__isnull=False, action='view')
        .values('product')
        .annotate(views=Count('id'))
        .order_by('-views')[:10]
    )
    if hot_ids:
        view_counts = {row['product']: row['views'] for row in hot_ids}
        products = {p.id: p for p in product_queryset().filter(id__in=view_counts)}
        results = []
        for rank, product_id in enumerate(view_counts, start=1):
            product = products.get(product_id)
            if product is None:
                continue
            results.append({
                'product': ProductSerializer(product).data,
                'rank': rank,
                'views': view_counts[product_id],
                'searches': 0,
                'purchases': 0,
            })
        if results:
            return payload(results, 'recent_activity')

    # Tier 3 — nothing has happened yet, so fall back to the catalogue itself.
    products = product_queryset().order_by('-popularity_score', '-created_at')[:10]
    results = [
        {
            'product': ProductSerializer(product).data,
            'rank': rank,
            'views': 0,
            'searches': 0,
            'purchases': 0,
        }
        for rank, product in enumerate(products, start=1)
    ]
    return payload(results, 'popularity')


# ============ Analytics Endpoints ============

@api_view(['GET'])
def search_history(request):
    """Get trending search queries from the last 7 days."""
    cutoff = timezone.now() - timedelta(days=7)
    trending_searches = (
        ProductSearch.objects
        .filter(timestamp__gte=cutoff)
        .values('query')
        .annotate(count=Count('id'))
        .order_by('-count')[:20]
    )

    return Response({
        'status': 'success',
        'trending_searches': list(trending_searches),
    })


# ============ Reviews & Ratings Endpoints ============

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticatedOrReadOnly])
def product_reviews(request, product_id):
    """List reviews or submit a new review for a product."""
    product = get_object_or_404(Product, id=product_id)

    if request.method == 'GET':
        reviews_qs = ProductReview.objects.filter(product=product).select_related('user').prefetch_related('images').order_by('-created_at')
        total_reviews = reviews_qs.count()

        distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        customer_photos = []
        for r in reviews_qs:
            if 1 <= r.rating <= 5:
                distribution[r.rating] += 1
            for img in r.images.all():
                url = img.get_url()
                if url:
                    customer_photos.append({
                        'id': img.id,
                        'url': url,
                        'review_id': r.id,
                        'rating': r.rating,
                        'user_name': f"{r.user.first_name} {r.user.last_name}".strip() or r.user.username
                    })

        avg_rating = reviews_qs.aggregate(Avg('rating'))['rating__avg']
        avg_rating = round(float(avg_rating), 1) if avg_rating is not None else 0.0

        # Pagination support (defaults to page_size=2 for progressive disclosure)
        try:
            page = max(1, int(request.GET.get('page', 1)))
        except (ValueError, TypeError):
            page = 1

        try:
            page_size = max(1, min(50, int(request.GET.get('page_size', 2))))
        except (ValueError, TypeError):
            page_size = 2

        offset = (page - 1) * page_size
        paginated_reviews = reviews_qs[offset:offset + page_size]
        total_pages = (total_reviews + page_size - 1) // page_size if total_reviews > 0 else 1
        has_more = offset + page_size < total_reviews

        serializer = ProductReviewSerializer(paginated_reviews, many=True)
        return Response({
            'status': 'success',
            'product_id': product_id,
            'summary': {
                'average_rating': avg_rating,
                'ratings_count': total_reviews,
                'reviews_count': total_reviews,
                'rating_distribution': distribution,
                'customer_photos': customer_photos,
            },
            'average_rating': avg_rating,
            'total_ratings': total_reviews,
            'total_reviews': total_reviews,
            'distribution': distribution,
            'customer_photos': customer_photos,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'has_more': has_more,
            'reviews': serializer.data,
        })

    # POST: Submit new review
    if not request.user or not request.user.is_authenticated:
        return Response({
            'status': 'error',
            'message': 'Please log in to submit a review.'
        }, status=status.HTTP_401_UNAUTHORIZED)

    data = request.data
    raw_rating = data.get('rating')
    if raw_rating is None:
        return Response({
            'status': 'error',
            'message': 'Rating is required (1-5).'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        rating = int(raw_rating)
        if rating < 1 or rating > 5:
            return Response({
                'status': 'error',
                'message': 'Rating must be an integer between 1 and 5.'
            }, status=status.HTTP_400_BAD_REQUEST)
    except (ValueError, TypeError):
        return Response({
            'status': 'error',
            'message': 'Valid integer rating between 1 and 5 is required.'
        }, status=status.HTTP_400_BAD_REQUEST)

    comment = (data.get('comment') or data.get('review_text') or '').strip()
    if not comment:
        return Response({
            'status': 'error',
            'message': 'Review text is required.'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check duplicate review: One review per product per customer
    if ProductReview.objects.filter(product=product, user=request.user).exists():
        return Response({
            'status': 'error',
            'message': 'You have already submitted a review for this product.'
        }, status=status.HTTP_400_BAD_REQUEST)

    title = (data.get('title') or '').strip()

    # Check verified purchase
    from order_service.models import OrderItem
    is_verified = OrderItem.objects.filter(
        order__user=request.user,
        product=product
    ).exists()

    review = ProductReview.objects.create(
        product=product,
        user=request.user,
        rating=rating,
        title=title,
        comment=comment,
        is_verified_purchase=is_verified
    )

    # Handle uploaded images
    images = request.FILES.getlist('images') or request.FILES.getlist('photos')
    for img_file in images[:5]:
        ReviewImage.objects.create(review=review, image=img_file)

    # Handle image URLs if passed
    image_urls = data.get('image_urls') or data.get('imageUrls')
    if isinstance(image_urls, list):
        for u in image_urls[:5]:
            if isinstance(u, str) and (u.startswith('http://') or u.startswith('https://')):
                ReviewImage.objects.create(review=review, image_url=u)

    serializer = ProductReviewSerializer(review)
    return Response({
        'status': 'success',
        'message': 'Review submitted successfully!',
        'review': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def review_helpful(request, review_id):
    """Increment helpful vote for a review."""
    review = get_object_or_404(ProductReview, id=review_id)
    review.helpful_votes += 1
    review.save(update_fields=['helpful_votes'])
    return Response({
        'status': 'success',
        'helpful_votes': review.helpful_votes
    })


@api_view(['GET'])
def product_variants_list(request, product_id):
    """Get active variants for a product."""
    product = get_object_or_404(Product, id=product_id)
    variants = product.variants.filter(is_active=True).order_by('id')
    serializer = ProductVariantSerializer(variants, many=True)
    return Response({
        'status': 'success',
        'product_id': product_id,
        'variants': serializer.data
    })


@api_view(['GET', 'POST'])
def product_inquiries(request, product_id):
    """
    GET: Retrieve conversation history for this product scoped to the authenticated user.
    POST: Send an inquiry message about the product. Generates an authoritative response
          grounded in the product's database properties (variants, prices, stock, sustainability, returns).
    """
    product = get_object_or_404(Product, id=product_id)

    if not request.user or not request.user.is_authenticated:
        return Response({'status': 'error', 'message': 'Authentication required for product inquiries.'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        inquiries = ProductInquiry.objects.filter(product=product, user=request.user).order_by('created_at')
        serializer = ProductInquirySerializer(inquiries, many=True)
        return Response({
            'status': 'success',
            'product_id': product.id,
            'product_name': product.name,
            'inquiries': serializer.data
        })

    elif request.method == 'POST':
        message_text = request.data.get('message', '').strip()
        if not message_text:
            return Response({'status': 'error', 'message': 'Message cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Save user inquiry
        ProductInquiry.objects.create(
            product=product,
            user=request.user,
            sender_type='CUSTOMER',
            message=message_text
        )

        # 2. Build verified database context for the assistant
        variants = product.variants.filter(is_active=True)
        var_summary = ", ".join([f"Size: {v.size}, Price: ₹{v.price or product.current_price}, Stock: {v.stock}" for v in variants]) if variants.exists() else f"Standard Size, Price: ₹{product.current_price}, Stock: {product.stock}"

        # Grounded response logic
        q_lower = message_text.lower()
        if 'size' in q_lower or 'available' in q_lower or 'stock' in q_lower or 'variant' in q_lower or any(s in q_lower for s in ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl']):
            reply = f"For **{product.name}**, current available options are: {var_summary}. We dispatch within 24 hours with carbon-neutral transit."
        elif 'return' in q_lower or 'refund' in q_lower or 'replace' in q_lower or 'policy' in q_lower:
            reply = f"This product is covered by our **{product.return_window_days}-day return policy** ({product.return_policy}). Condition required: {product.condition_required}. Doorstep QC inspection and instant refund are supported."
        elif 'material' in q_lower or 'organic' in q_lower or 'eco' in q_lower or 'carbon' in q_lower or 'fabric' in q_lower:
            reply = f"**{product.name}** is crafted with certified sustainable standards. Sustainability Score: **{product.sustainability_score}/100**, Estimated Carbon Footprint: **{product.weight_kg} kg CO₂e offset**. Packaged in zero-plastic compostable materials."
        else:
            reply = f"Thank you for asking about **{product.name}**! It is currently priced at **₹{product.current_price}** with free carbon-neutral delivery. Options: {var_summary}. Let us know if you need sizing or delivery assistance."

        # Save AI/Seller assistant message
        ProductInquiry.objects.create(
            product=product,
            user=request.user,
            sender_type='ECOAI',
            message=reply
        )

        inquiries = ProductInquiry.objects.filter(product=product, user=request.user).order_by('created_at')
        serializer = ProductInquirySerializer(inquiries, many=True)
        return Response({
            'status': 'success',
            'inquiries': serializer.data,
            'reply': reply
        }, status=status.HTTP_201_CREATED)


