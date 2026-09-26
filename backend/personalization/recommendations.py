from products.models import Product
from .models import UserPreference
from accounts.models import ActivityLog
from django.db.models import Case, When, Value, FloatField

class RecommendationService:
    def __init__(self, user):
        self.user = user
        try:
            self.prefs = UserPreference.objects.get(user=self.user)
        except UserPreference.DoesNotExist:
            self.prefs = None

    def get_recommendations(self, num_recommendations=10):
        if not self.prefs:
            return Product.objects.none()

        products = Product.objects.all()

        # --- Initial Filtering based on explicit preferences ---
        if self.prefs.age_group:
            products = products.filter(age_groups=self.prefs.age_group)
        if self.prefs.gender_category:
            if self.prefs.gender_category.name == 'Unisex':
                products = products.filter(gender_categories__name__in=['Men', 'Women', 'Unisex'])
            else:
                products = products.filter(gender_categories=self.prefs.gender_category)
        if self.prefs.preferred_categories.exists():
            products = products.filter(category__in=self.prefs.preferred_categories.all())
        if self.prefs.budget_min:
            products = products.filter(current_price__gte=self.prefs.budget_min)
        if self.prefs.budget_max:
            products = products.filter(current_price__lte=self.prefs.budget_max)
        if self.prefs.eco_preferences.exists():
            products = products.filter(eco_tags__in=self.prefs.eco_preferences.all()).distinct()

        # --- Scoring and Ranking based on behavior and attributes ---
        
        # Get user's recent activity
        recent_activity = ActivityLog.objects.filter(user=self.user, product__isnull=False).order_by('-timestamp')[:50]
        
        viewed_product_ids = [log.product.id for log in recent_activity if log.action == 'view']
        added_to_cart_ids = [log.product.id for log in recent_activity if log.action == 'add_to_cart']
        purchased_ids = [log.product.id for log in recent_activity if log.action == 'purchase']

        # Get categories from recently interacted products
        interacted_categories = Product.objects.filter(
            id__in=viewed_product_ids + added_to_cart_ids + purchased_ids
        ).values_list('category_id', flat=True)

        # Create a scoring system
        score_annotation = Case(
            # Higher score for purchased items' categories
            When(category_id__in=interacted_categories, then=Value(1.5)),
            # Medium score for items in cart categories
            When(category_id__in=interacted_categories, then=Value(1.2)),
            # Lower score for viewed items' categories
            When(category_id__in=interacted_categories, then=Value(1.1)),
            default=Value(1.0),
            output_field=FloatField()
        )

        # Annotate products with a combined score
        products = products.annotate(
            behavior_score=score_annotation
        ).annotate(
            final_score=(
                models.F('behavior_score') * 
                (1 + models.F('sustainability_score') / 2) * 
                (1 + models.F('popularity_score') / 2)
            )
        )

        # Exclude items already purchased by the user
        products = products.exclude(id__in=purchased_ids)

        # Order by the final score
        products = products.order_by('-final_score')

        return products[:num_recommendations]

