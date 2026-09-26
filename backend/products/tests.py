from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Product, Category, PriceHistory
from order_service.models import Order, OrderItem
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
