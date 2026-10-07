from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Product, Category, PriceHistory
from order_service.models import Order, OrderItem
from django.utils import timezone
from decimal import Decimal

User = get_user_model()


class ProductAndAdminRBACTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Regular customer
        self.regular_user = User.objects.create_user(
            username='regularcustomer',
            email='customer@econext.test',
            password='customerpassword123'
        )
        
        # Admin / Staff user
        self.admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@econext.test',
            password='adminpassword123',
            is_staff=True
        )
        
        # Category
        self.category = Category.objects.create(
            name='Sustainable Apparel',
            description='Eco friendly organic clothing'
        )
        
        # Product
        self.product = Product.objects.create(
            name='Organic Bamboo T-Shirt',
            description='Premium 100% organic bamboo apparel',
            category=self.category,
            current_price=Decimal('799.00'),
            stock=50,
            sustainability_score=92.0
        )

    def test_product_creation_and_attributes(self):
        """Verify product model fields and calculations."""
        self.assertEqual(self.product.name, 'Organic Bamboo T-Shirt')
        self.assertEqual(self.product.sustainability_score, 92.0)
        self.assertEqual(self.product.category.name, 'Sustainable Apparel')

    def test_admin_dashboard_rbac_forbidden_for_unauthenticated(self):
        """Unauthenticated requests must receive 401/403."""
        response = self.client.get('/api/admin/dashboard/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_admin_dashboard_rbac_forbidden_for_regular_user(self):
        """Non-admin customer must be forbidden from accessing admin metrics."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/admin/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_dashboard_accessible_for_admin_user(self):
        """Admin/Staff user can access dashboard stats."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('total_products', response.data['data'])
        self.assertIn('total_revenue', response.data['data'])

    def test_admin_create_product(self):
        """Admin can create new products via /api/admin/products/."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Recycled Ocean Plastic Bag',
            'description': 'Handcrafted from 100% ocean-bound recycled plastic',
            'category': self.category.id,
            'current_price': '499.00',
            'stock': 30,
            'sustainability_score': 95.0
        }
        response = self.client.post('/api/admin/products/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Product.objects.filter(name='Recycled Ocean Plastic Bag').exists())

    def test_admin_orders_list(self):
        """Admin can list customer orders."""
        order = Order.objects.create(
            user=self.regular_user,
            total_price=Decimal('799.00'),
            status='pending',
            shipping_address='123 Green Way',
            city='Eco City',
            state='State',
            zipcode='560001',
            country='India'
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['id'], order.id)

    def test_order_item_return_policy_snapshot_immutability(self):
        """At order creation time, product return policy is snapshotted into OrderItem and unaffected by subsequent catalog changes."""
        from django.utils import timezone
        # Create order with snapshotted item
        order = Order.objects.create(
            user=self.regular_user,
            total_price=Decimal('799.00'),
            status='DELIVERED',
            delivered_at=timezone.now(),
            shipping_address='123 Green Way',
            city='Eco City',
            state='State',
            zipcode='560001',
            country='India'
        )
        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            quantity=1,
            price_at_purchase=self.product.current_price,
            return_eligible=True,
            return_window_days=7,
            return_policy='7-day replacement or return',
            condition_required='Unused, tags intact'
        )
        self.assertTrue(item.return_eligible)
        self.assertEqual(item.return_window_days, 7)

        # Later, modify product catalog policy to non-returnable
        self.product.return_eligible = False
        self.product.return_window_days = 0
        self.product.save()

        # Verify historical order item still preserves original snapshot
        item.refresh_from_db()
        self.assertTrue(item.return_eligible)
        self.assertEqual(item.return_window_days, 7)

        # Order eligibility check still evaluates true based on snapshot
        is_eligible, msg = order.is_return_eligible()
        self.assertTrue(is_eligible)

    def test_return_window_boundary_calculation(self):
        """Return window is calculated from delivered_at date: valid on day 0, day 6, expired on day 8."""
        from django.utils import timezone
        now = timezone.now()

        # 1. Order delivered today -> Eligible
        order_today = Order.objects.create(
            user=self.regular_user,
            total_price=Decimal('799.00'),
            status='DELIVERED',
            delivered_at=now,
            shipping_address='123 Green Way', city='Eco City', state='State', zipcode='560001', country='India'
        )
        OrderItem.objects.create(
            order=order_today, product=self.product, quantity=1, price_at_purchase=Decimal('799.00'),
            return_eligible=True, return_window_days=7
        )
        eligible, _ = order_today.is_return_eligible()
        self.assertTrue(eligible)

        # 2. Order delivered 6 days ago -> Eligible
        order_day6 = Order.objects.create(
            user=self.regular_user,
            total_price=Decimal('799.00'),
            status='DELIVERED',
            delivered_at=now - timezone.timedelta(days=6),
            shipping_address='123 Green Way', city='Eco City', state='State', zipcode='560001', country='India'
        )
        OrderItem.objects.create(
            order=order_day6, product=self.product, quantity=1, price_at_purchase=Decimal('799.00'),
            return_eligible=True, return_window_days=7
        )
        eligible_day6, _ = order_day6.is_return_eligible()
        self.assertTrue(eligible_day6)

        # 3. Order delivered 8 days ago -> Expired
        order_day8 = Order.objects.create(
            user=self.regular_user,
            total_price=Decimal('799.00'),
            status='DELIVERED',
            delivered_at=now - timezone.timedelta(days=8),
            shipping_address='123 Green Way', city='Eco City', state='State', zipcode='560001', country='India'
        )
        OrderItem.objects.create(
            order=order_day8, product=self.product, quantity=1, price_at_purchase=Decimal('799.00'),
            return_eligible=True, return_window_days=7
        )
        eligible_day8, msg8 = order_day8.is_return_eligible()
        self.assertFalse(eligible_day8)
        self.assertIn('expired', msg8.lower())

    def test_non_returnable_product_backend_rejection(self):
        """Backend rejects return requests for non-returnable products."""
        from django.utils import timezone
        order = Order.objects.create(
            user=self.regular_user,
            total_price=Decimal('799.00'),
            status='DELIVERED',
            delivered_at=timezone.now(),
            shipping_address='123 Green Way', city='Eco City', state='State', zipcode='560001', country='India'
        )
        OrderItem.objects.create(
            order=order, product=self.product, quantity=1, price_at_purchase=Decimal('799.00'),
            return_eligible=False, return_window_days=0, return_policy='Non-returnable personal care product'
        )

        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(f'/api/orders/{order.id}/returns/', {'reason': 'Changed mind'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not eligible for return', response.data['message'].lower())

    def test_cancellation_lifecycle_and_delivered_restriction(self):
        """Pre-delivery orders can be cancelled; delivered orders cannot be cancelled via standard cancellation."""
        # 1. Cancel placed order
        order = Order.objects.create(
            user=self.regular_user,
            total_price=Decimal('799.00'),
            status='ORDER_PLACED',
            shipping_address='123 Green Way', city='Eco City', state='State', zipcode='560001', country='India'
        )
        self.client.force_authenticate(user=self.regular_user)
        res_cancel = self.client.post(f'/api/orders/{order.id}/cancel/', {'reason': 'Wrong size ordered'}, format='json')
        self.assertEqual(res_cancel.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.canonical_status, 'CANCELLED')
        self.assertEqual(order.cancellation_reason, 'Wrong size ordered')

        # 2. Delivered order cancellation must fail
        order_delivered = Order.objects.create(
            user=self.regular_user,
            total_price=Decimal('799.00'),
            status='DELIVERED',
            delivered_at=timezone.now(),
            shipping_address='123 Green Way', city='Eco City', state='State', zipcode='560001', country='India'
        )
        res_deliv_cancel = self.client.post(f'/api/orders/{order_delivered.id}/cancel/', {'reason': 'Item defective'}, format='json')
        self.assertEqual(res_deliv_cancel.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('delivered orders cannot be cancelled', res_deliv_cancel.data['message'].lower())

    def test_delivery_otp_security_enforcement(self):
        """Direct transition from OUT_FOR_DELIVERY to DELIVERED is forbidden without verified OTP audit record."""
        order = Order.objects.create(
            user=self.regular_user,
            total_price=Decimal('799.00'),
            status='OUT_FOR_DELIVERY',
            shipping_address='123 Green Way', city='Eco City', state='State', zipcode='560001', country='India'
        )
        self.client.force_authenticate(user=self.admin_user)

        # Attempt to mark DELIVERED via update_order_status without OTP audit
        response = self.client.patch(f'/api/orders/{order.id}/status/', {'status': 'DELIVERED'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('forbidden', response.data['message'].lower())

        # Attempt via admin_order_status_update
        response2 = self.client.patch(f'/api/admin/orders/{order.id}/status/', {'status': 'DELIVERED'}, format='json')
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('forbidden', response2.data['message'].lower())

    def test_variant_size_pricing_and_cart_integration(self):
        """Selecting different size variants dynamically enforces authoritative backend prices into cart and order."""
        from products.models import ProductVariant
        from shop_cart.models import CartItem

        # Create sizes: XXS (268), M (378), XL (408), XXXL (438)
        var_xxs = ProductVariant.objects.create(product=self.product, size='XXS', price=Decimal('268.00'), stock=10)
        var_m = ProductVariant.objects.create(product=self.product, size='M', price=Decimal('378.00'), stock=10)
        var_xl = ProductVariant.objects.create(product=self.product, size='XL', price=Decimal('408.00'), stock=10)
        var_xxxl = ProductVariant.objects.create(product=self.product, size='XXXL', price=Decimal('438.00'), stock=10)

        self.client.force_authenticate(user=self.regular_user)

        # 1. Add XL variant (price 408) to cart with quantity 2
        res_cart = self.client.post('/api/cart/add/', {
            'product_id': self.product.id,
            'variant_id': var_xl.id,
            'quantity': 2
        }, format='json')
        self.assertEqual(res_cart.status_code, status.HTTP_200_OK)

        cart_data = res_cart.data['cart']
        self.assertEqual(len(cart_data['items']), 1)
        item = cart_data['items'][0]
        self.assertEqual(item['variant']['size'], 'XL')
        self.assertEqual(Decimal(item['price']), Decimal('408.00'))
        self.assertEqual(Decimal(item['subtotal']), Decimal('816.00'))
        self.assertEqual(Decimal(cart_data['total']), Decimal('816.00'))

        # 2. Checkout via Cash on Delivery
        shipping_payload = {
            'first_name': 'Shiva',
            'last_name': 'Kumar',
            'phone': '+91 98765 43210',
            'email': 'shiva@econext.test',
            'address': 'Flat 101, Eco Sanctuary',
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'zipcode': '560001',
            'country': 'India',
            'payment_method': 'cod'
        }
        res_order = self.client.post('/api/orders/create/', {'shipping': shipping_payload}, format='json')
        self.assertIn(res_order.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        order_data = res_order.data['order']
        self.assertEqual(Decimal(order_data['total_price']), Decimal('816.00'))
        self.assertEqual(len(order_data['items']), 1)
        order_item = order_data['items'][0]
        self.assertEqual(order_item['variant']['size'], 'XL')
        self.assertEqual(Decimal(order_item['price_at_purchase']), Decimal('408.00'))
        self.assertEqual(Decimal(order_item['subtotal']), Decimal('816.00'))

    def test_saved_address_system_security(self):
        """User addresses are strictly scoped to the authenticated customer; unauthorized access is blocked."""
        from accounts.models import UserAddress

        self.client.force_authenticate(user=self.regular_user)

        # Create address
        res_create = self.client.post('/api/auth/addresses/', {
            'address_type': 'HOME',
            'full_name': 'Aarav Patel',
            'phone': '+91 98765 43210',
            'address_line': '42 Eco Road, Green Zone',
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'zipcode': '400001',
            'country': 'India',
            'is_default': True
        }, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        addr_id = res_create.data['data']['id']

        # List addresses
        res_list = self.client.get('/api/auth/addresses/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data['data']), 1)

        # Another user tries to access this address
        other_user = User.objects.create_user(username='other_user', password='password123')
        self.client.force_authenticate(user=other_user)

        res_other_list = self.client.get('/api/auth/addresses/')
        self.assertEqual(res_other_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_other_list.data['data']), 0)

        # Unauthorized access to specific address returns 404
        res_unauth = self.client.get(f'/api/auth/addresses/{addr_id}/')
        self.assertEqual(res_unauth.status_code, status.HTTP_404_NOT_FOUND)

    def test_review_submission_and_eligibility(self):
        """Reviews can be fetched publicly and submitted by authenticated users with verified purchase detection."""
        # 1. Anonymous GET reviews -> 200 OK
        res_get = self.client.get(f'/api/products/{self.product.id}/reviews/')
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertIn('distribution', res_get.data)
        self.assertIn('average_rating', res_get.data)
        self.assertEqual(res_get.data['total_reviews'], 0)

        # 2. Unauthenticated POST review -> 401 Unauthorized
        res_unauth_post = self.client.post(f'/api/products/{self.product.id}/reviews/', {
            'rating': 5,
            'comment': 'Awesome sustainable product!'
        }, format='json')
        self.assertEqual(res_unauth_post.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('authentication credentials', res_unauth_post.data.get('message', '').lower() or res_unauth_post.data.get('detail', '').lower())

        # 3. Authenticated POST with invalid rating -> 400 Bad Request
        self.client.force_authenticate(user=self.regular_user)
        res_bad_rating = self.client.post(f'/api/products/{self.product.id}/reviews/', {
            'rating': 7,
            'comment': 'Invalid rating test'
        }, format='json')
        self.assertEqual(res_bad_rating.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Authenticated POST with empty comment -> 400 Bad Request
        res_empty_comment = self.client.post(f'/api/products/{self.product.id}/reviews/', {
            'rating': 4,
            'comment': '   '
        }, format='json')
        self.assertEqual(res_empty_comment.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Authenticated valid review submission -> 201 Created
        from products.models import ProductReview, ReviewImage
        res_post = self.client.post(f'/api/products/{self.product.id}/reviews/', {
            'rating': 5,
            'title': 'Outstanding Organic Cotton',
            'comment': 'Really loved the soft feel and plastic-free packaging.',
            'image_urls': ['https://example.com/customer_photo.jpg']
        }, format='json')
        self.assertEqual(res_post.status_code, status.HTTP_201_CREATED)
        review_id = res_post.data['review']['id']
        self.assertEqual(res_post.data['review']['rating'], 5)
        self.assertEqual(res_post.data['review']['title'], 'Outstanding Organic Cotton')

        # Verify record exists directly in MySQL database
        db_review = ProductReview.objects.get(id=review_id)
        self.assertEqual(db_review.product_id, self.product.id)
        self.assertEqual(db_review.user_id, self.regular_user.id)
        self.assertEqual(db_review.rating, 5)
        self.assertEqual(db_review.title, 'Outstanding Organic Cotton')
        self.assertTrue(ReviewImage.objects.filter(review=db_review).exists())

        # 6. Duplicate review submission by same user -> 400 Bad Request
        res_duplicate = self.client.post(f'/api/products/{self.product.id}/reviews/', {
            'rating': 4,
            'comment': 'Attempting second review on same item'
        }, format='json')
        self.assertEqual(res_duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already submitted', res_duplicate.data['message'].lower())

        # 7. GET reviews pagination test (verifies persistence)
        res_paginated = self.client.get(f'/api/products/{self.product.id}/reviews/?page=1&page_size=1')
        self.assertEqual(res_paginated.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_paginated.data['reviews']), 1)
        self.assertEqual(res_paginated.data['total_reviews'], 1)
        self.assertEqual(res_paginated.data['average_rating'], 5.0)

        # 8. Malformed JWT Authorization Header test -> 401 Unauthorized
        client_with_bad_jwt = APIClient()
        client_with_bad_jwt.credentials(HTTP_AUTHORIZATION='Bearer invalid.malformed.jwt.token')
        res_bad_jwt = client_with_bad_jwt.post(f'/api/products/{self.product.id}/reviews/', {
            'rating': 5,
            'comment': 'Review with bad token'
        }, format='json')
        self.assertEqual(res_bad_jwt.status_code, status.HTTP_401_UNAUTHORIZED)

