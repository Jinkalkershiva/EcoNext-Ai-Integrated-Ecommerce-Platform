"""
Bulk Data Import Wizard API for EcoNext Admin Panel.
Provides deterministic CSV/XLSX validation, AI-assisted suggestions,
transactional import execution, summary reporting, and audit logging.
"""

import os
import time
import logging
from decimal import Decimal
from django.db import transaction
from django.utils.text import slugify
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from products.models import Product, Category, AgeGroup, GenderCategory, PriceHistory
from accounts.models import ActivityLog
from accounts.auth_views import is_admin_or_has_perm

logger = logging.getLogger(__name__)


class IsAuthorizedBulkImportOperator(BasePermission):
    """
    Grants access if the request is from a staff/admin with DATA_IMPORT, BULK_IMPORT_PRODUCTS,
    or CATALOG_CREATE permission, is a superuser, or carries a valid internal service key.
    """
    def has_permission(self, request, view):
        internal_key = request.headers.get('X-Internal-Service-Key') or request.META.get('HTTP_X_INTERNAL_SERVICE_KEY')
        configured_key = os.getenv('INTERNAL_SERVICE_KEY', 'econext-internal-microservice-key-2026')
        if internal_key and internal_key == configured_key:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if not request.user.is_staff:
            return False
        return (
            is_admin_or_has_perm(request.user, 'DATA_IMPORT') or
            is_admin_or_has_perm(request.user, 'BULK_IMPORT_PRODUCTS') or
            is_admin_or_has_perm(request.user, 'CATALOG_CREATE') or
            is_admin_or_has_perm(request.user, 'ROLE_ADMIN')
        )


# Known taxonomy mapping for AI suggestions
TAXONOMY_ALIASES = {
    'kid': {'suggest': 'Kids', 'reason': "Existing taxonomy contains 'Kids' as primary category."},
    'kids': {'suggest': 'Kids', 'reason': "Matches 'Kids' category and AgeGroup taxonomy."},
    'children': {'suggest': 'Kids', 'reason': "Children mapped to 'Kids' age group taxonomy."},
    'child': {'suggest': 'Kids', 'reason': "Child mapped to 'Kids' age group taxonomy."},
    'boy': {'suggest': 'Kids', 'reason': "Mapped to 'Kids' age group and Men gender category."},
    'girl': {'suggest': 'Kids', 'reason': "Mapped to 'Kids' age group and Women gender category."},
    'apparel': {'suggest': 'Apparel', 'reason': "Standardized Apparel taxonomy."},
    'apparels': {'suggest': 'Apparel', 'reason': "Normalized plural 'Apparels' to 'Apparel'."},
    'clothing': {'suggest': 'Apparel', 'reason': "Normalized Clothing to Apparel category."},
    'clothes': {'suggest': 'Apparel', 'reason': "Normalized Clothes to Apparel category."},
    'footwear': {'suggest': 'Footwear', 'reason': "Standardized Footwear taxonomy."},
    'footwears': {'suggest': 'Footwear', 'reason': "Normalized plural to 'Footwear'."},
    'shoes': {'suggest': 'Footwear', 'reason': "Normalized Shoes to Footwear category."},
    'home': {'suggest': 'Home & Living', 'reason': "Standardized to 'Home & Living' category."},
    'kitchen': {'suggest': 'Kitchen & Dining', 'reason': "Standardized to 'Kitchen & Dining' category."},
    'accessories': {'suggest': 'Accessories', 'reason': "Standardized Accessories taxonomy."}
}


@api_view(['POST'])
@permission_classes([IsAuthorizedBulkImportOperator])
def validate_bulk_import(request):
    """
    Step 3: Deterministic validation followed by assistive AI suggestions.
    Validation is deterministic and authoritative.
    """
    rows = request.data.get('rows', [])
    check_db_duplicates = request.data.get('checkDuplicates', True)

    if not rows:
        return Response({
            'status': 'error',
            'message': 'No data rows provided for validation.'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Fetch existing SKUs and categories for deterministic checks
    existing_skus = set()
    if check_db_duplicates:
        for p in Product.objects.all():
            for t in (p.tags or []):
                if isinstance(t, str) and t.startswith('SKU:'):
                    existing_skus.add(t.split('SKU:', 1)[1].strip())

    existing_categories = {c.name.lower(): c.name for c in Category.objects.all()}
    existing_age_groups = {a.name.lower(): a.name for a in AgeGroup.objects.all()}

    seen_file_skus = set()
    validated_rows = []
    
    total_count = len(rows)
    valid_count = 0
    error_count = 0
    warning_count = 0
    ai_suggestion_count = 0

    for idx, raw_row in enumerate(rows, start=1):
        row_num = raw_row.get('rowNumber', idx)
        data = raw_row.get('data', raw_row)

        errors = []
        warnings = []
        ai_suggestions = []

        # 1. Required & Format: SKU
        sku = str(data.get('sku', '')).strip()
        if not sku:
            errors.append({'field': 'sku', 'message': 'SKU is required.'})
        else:
            if sku in seen_file_skus:
                errors.append({'field': 'sku', 'message': f'Duplicate SKU "{sku}" in uploaded file.'})
            elif sku in existing_skus:
                errors.append({'field': 'sku', 'message': f'SKU "{sku}" already exists in database.'})
            else:
                seen_file_skus.add(sku)

        # 2. Required & Format: Product Name
        name = str(data.get('name', data.get('product_name', ''))).strip()
        if not name:
            errors.append({'field': 'name', 'message': 'Product Name is required.'})

        # 3. Required & Numeric: Price
        raw_price = data.get('price', data.get('unit_price', data.get('currentPrice', '')))
        price_val = None
        if raw_price is None or str(raw_price).strip() == '':
            errors.append({'field': 'price', 'message': 'Price is required.'})
        else:
            try:
                clean_price_str = str(raw_price).replace('₹', '').replace(',', '').strip()
                price_val = Decimal(clean_price_str)
                if price_val <= 0:
                    errors.append({'field': 'price', 'message': f'Price "{raw_price}" must be greater than 0.'})
            except Exception:
                errors.append({'field': 'price', 'message': f'Price "{raw_price}" is not a valid numeric amount.'})

        # 4. Stock
        raw_stock = data.get('stock', data.get('stockQuantity', data.get('quantity', 0)))
        stock_val = 0
        if raw_stock is not None and str(raw_stock).strip() != '':
            try:
                stock_val = int(float(str(raw_stock).replace(',', '').strip()))
                if stock_val < 0:
                    errors.append({'field': 'stock', 'message': f'Stock "{raw_stock}" cannot be negative.'})
            except Exception:
                errors.append({'field': 'stock', 'message': f'Stock "{raw_stock}" is not a valid integer.'})

        # 5. Category validation & AI suggestion
        cat_name = str(data.get('category', data.get('categoryName', data.get('category_name', '')))).strip()
        if not cat_name:
            errors.append({'field': 'category', 'message': 'Category is required.'})
        else:
            cat_lower = cat_name.lower()
            cat_exists = (cat_lower in existing_categories) or (cat_lower in existing_age_groups) or (cat_lower == 'kids')
            
            if not cat_exists:
                # Check for AI suggestions
                if cat_lower in TAXONOMY_ALIASES:
                    alias_info = TAXONOMY_ALIASES[cat_lower]
                    ai_suggestions.append({
                        'field': 'category',
                        'current_value': cat_name,
                        'suggested_value': alias_info['suggest'],
                        'reason': alias_info['reason'],
                        'confidence': 0.95
                    })
                    errors.append({'field': 'category', 'message': f'Category "{cat_name}" does not exist in taxonomy.'})
                else:
                    errors.append({'field': 'category', 'message': f'Category "{cat_name}" does not exist in taxonomy.'})
            else:
                # Provide normalization suggestion if casing doesn't match
                canonical = existing_categories.get(cat_lower) or existing_age_groups.get(cat_lower)
                if canonical and canonical != cat_name:
                    ai_suggestions.append({
                        'field': 'category',
                        'current_value': cat_name,
                        'suggested_value': canonical,
                        'reason': f"Match with canonical taxonomy '{canonical}'.",
                        'confidence': 0.99
                    })

        # 6. Sustainability Score
        raw_score = data.get('sustainability_score', data.get('sustainabilityScore', None))
        if raw_score is not None and str(raw_score).strip() != '':
            try:
                score_val = float(str(raw_score).strip())
                if score_val < 0 or score_val > 100:
                    errors.append({'field': 'sustainabilityScore', 'message': f'Sustainability Score ({raw_score}) must be between 0 and 100.'})
            except Exception:
                errors.append({'field': 'sustainabilityScore', 'message': f'Sustainability Score ({raw_score}) is not a valid number.'})

        # 7. Carbon Footprint
        raw_carbon = data.get('carbon_footprint', data.get('carbonFootprintKg', None))
        if raw_carbon is not None and str(raw_carbon).strip() != '':
            try:
                carbon_val = float(str(raw_carbon).strip())
                if carbon_val < 0:
                    errors.append({'field': 'carbonFootprintKg', 'message': f'Carbon Footprint ({raw_carbon}) cannot be negative.'})
            except Exception:
                errors.append({'field': 'carbonFootprintKg', 'message': f'Carbon Footprint ({raw_carbon}) is not a valid number.'})

        # 8. AI Review for Materials & Claims
        raw_materials = str(data.get('materials', data.get('materialsUsed', ''))).strip()
        if raw_materials and ('%' not in raw_materials and 'organic' in raw_materials.lower()):
            ai_suggestions.append({
                'field': 'materials',
                'current_value': raw_materials,
                'suggested_value': raw_materials.title() + ' (Verify % Composition)',
                'reason': 'Materials composition should include measurable percentages for ESG audit compliance.',
                'confidence': 0.88
            })

        # Compile status
        is_valid = len(errors) == 0
        if is_valid:
            valid_count += 1
        else:
            error_count += 1

        if len(warnings) > 0:
            warning_count += 1
        if len(ai_suggestions) > 0:
            ai_suggestion_count += 1

        validated_rows.append({
            'rowNumber': row_num,
            'data': data,
            'isValid': is_valid,
            'errors': errors,
            'warnings': warnings,
            'aiSuggestions': ai_suggestions
        })

    return Response({
        'status': 'success',
        'summary': {
            'totalRows': total_count,
            'validRows': valid_count,
            'errorRows': error_count,
            'warningRows': warning_count,
            'aiSuggestionRows': ai_suggestion_count,
            'canProceed': valid_count > 0
        },
        'rows': validated_rows
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthorizedBulkImportOperator])
def execute_bulk_import(request):
    """
    Step 4: Execute transactional bulk import of approved valid records into catalog.
    Creates products, associates categories/age groups, sets stock, and records audit trail.
    """
    rows = request.data.get('rows', [])
    filename = request.data.get('filename', 'bulk_products_import.csv')
    skip_errors = request.data.get('skipErrors', True)

    if not rows:
        return Response({
            'status': 'error',
            'message': 'No product records submitted for import execution.'
        }, status=status.HTTP_400_BAD_REQUEST)

    start_time = time.time()
    user_name = request.user.username if (request.user and request.user.is_authenticated) else 'ADMIN'

    imported_records = []
    skipped_records = []
    warnings_count = 0

    with transaction.atomic():
        for idx, row_item in enumerate(rows, start=1):
            data = row_item.get('data', row_item)
            sku = str(data.get('sku', '')).strip()
            name = str(data.get('name', data.get('product_name', ''))).strip()

            if not sku or not name:
                skipped_records.append({
                    'rowNumber': idx,
                    'sku': sku,
                    'name': name,
                    'reason': 'Missing mandatory SKU or Product Name.'
                })
                continue

            # Check duplicate SKU
            if any(f"SKU:{sku}" in (p.tags or []) for p in Product.objects.all()):
                skipped_records.append({
                    'rowNumber': idx,
                    'sku': sku,
                    'name': name,
                    'reason': f'SKU "{sku}" already exists in database.'
                })
                continue

            # Resolve Price
            try:
                price_str = str(data.get('price', data.get('unit_price', data.get('currentPrice', '100')))).replace('₹', '').replace(',', '').strip()
                price = Decimal(price_str)
                if price <= 0:
                    skipped_records.append({'rowNumber': idx, 'sku': sku, 'reason': 'Price must be greater than 0.'})
                    continue
            except Exception:
                skipped_records.append({'rowNumber': idx, 'sku': sku, 'reason': 'Invalid price format.'})
                continue

            # Resolve Stock
            try:
                stock_str = str(data.get('stock', data.get('stockQuantity', data.get('quantity', '50')))).replace(',', '').strip()
                stock = max(0, int(float(stock_str)))
            except Exception:
                stock = 0

            # Resolve Category & AgeGroup
            cat_name = str(data.get('category', data.get('categoryName', data.get('category_name', 'Apparel')))).strip()
            is_kids = cat_name.lower() in ['kids', 'kid', 'children', 'child', 'boy', 'girl']

            category = None
            if is_kids:
                category, _ = Category.objects.get_or_create(
                    name='Kids',
                    defaults={'description': 'Sustainable clothing and products for children'}
                )
            else:
                category, _ = Category.objects.get_or_create(
                    name=cat_name,
                    defaults={'description': f'EcoNext {cat_name} sustainable collection'}
                )

            # Sustainability Score & Carbon
            try:
                sust_score = float(str(data.get('sustainability_score', data.get('sustainabilityScore', 85))).strip())
            except Exception:
                sust_score = 85.0

            description = str(data.get('description', f"Premium sustainable {name} crafted with certified eco-friendly materials.")).strip()
            image_url = str(data.get('image_url') or data.get('imageUrl') or data.get('image') or '').strip()
            if image_url and not (image_url.startswith('http://') or image_url.startswith('https://') or image_url.startswith('//')):
                image_url = ''

            # Create Product
            product = Product.objects.create(
                name=name,
                category=category,
                current_price=price,
                stock=stock,
                image_url=image_url,
                description=description,
                sustainability_score=sust_score,
                tags=[f"SKU:{sku}", category.name.lower(), "bulk-import"]
            )

            # Link AgeGroup if kids
            if is_kids:
                kids_age_group, _ = AgeGroup.objects.get_or_create(
                    name='Kids'
                )
                product.age_groups.add(kids_age_group)

            # Record Price History
            try:
                from django.utils import timezone
                PriceHistory.objects.create(
                    product=product,
                    price=price,
                    date=timezone.now().date()
                )
            except Exception:
                pass

            imported_records.append({
                'id': product.id,
                'sku': sku,
                'name': product.name,
                'price': float(product.current_price),
                'stock': product.stock,
                'category': category.name
            })

    duration_ms = round((time.time() - start_time) * 1000, 2)
    import_id = f"IMP-{int(time.time())}"

    # Audit log
    try:
        if request.user and request.user.is_authenticated:
            ActivityLog.objects.create(
                user=request.user,
                action='BULK_IMPORT_EXECUTED',
                details={
                    'import_id': import_id,
                    'filename': filename,
                    'total_submitted': len(rows),
                    'imported_count': len(imported_records),
                    'skipped_count': len(skipped_records),
                    'duration_ms': duration_ms
                }
            )
    except Exception as e:
        logger.warning(f"Audit log record note: {e}")

    # Kafka event emission
    try:
        from site_analytics.kafka_producer import publish_bulk_import_completed_event
        publish_bulk_import_completed_event(
            import_id=import_id,
            filename=filename,
            imported_count=len(imported_records),
            skipped_count=len(skipped_records),
            user_name=user_name
        )
    except Exception as e:
        logger.debug(f"Kafka import event note: {e}")


    return Response({
        'status': 'success',
        'importId': import_id,
        'filename': filename,
        'totalRows': len(rows),
        'imported': len(imported_records),
        'skipped': len(skipped_records),
        'warnings': warnings_count,
        'durationMs': duration_ms,
        'importedRecords': imported_records,
        'skippedRecords': skipped_records
    }, status=status.HTTP_201_CREATED)
