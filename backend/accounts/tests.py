from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.otp_service import RedisOTPService
from accounts.models import UserProfile

User = get_user_model()


class RedisOTPAndAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.email = 'tester@econext.test'
        self.user = User.objects.create_user(
            username='testuser',
            email=self.email,
            password='initialpassword123'
        )

    def test_redis_otp_generation_and_verification(self):
        """Verify OTP generation, storage, and validation."""
        otp_code = RedisOTPService.generate_otp(self.email, purpose='login')
        self.assertEqual(len(otp_code), 6)
        self.assertTrue(otp_code.isdigit())

        # Correct OTP verification
        is_valid, msg = RedisOTPService.verify_otp(self.email, otp_code, purpose='login')
        self.assertTrue(is_valid)

        # Replay should fail
        is_valid_again, _ = RedisOTPService.verify_otp(self.email, otp_code, purpose='login')
        self.assertFalse(is_valid_again)

    def test_redis_otp_endpoint_send_and_verify(self):
        """Verify POST /api/auth/otp/send/ and /api/auth/otp/verify/."""
        # 1. Send OTP
        res_send = self.client.post('/api/auth/otp/send/', {'email': self.email, 'purpose': 'login'}, format='json')
        self.assertEqual(res_send.status_code, status.HTTP_200_OK)
        self.assertEqual(res_send.data['status'], 'success')
        otp_code = res_send.data['dev_otp']

        # 2. Verify OTP and receive JWT tokens
        res_verify = self.client.post('/api/auth/otp/verify/', {
            'email': self.email,
            'otp': otp_code,
            'purpose': 'login'
        }, format='json')
        self.assertEqual(res_verify.status_code, status.HTTP_200_OK)
        self.assertEqual(res_verify.data['status'], 'success')
        self.assertIn('tokens', res_verify.data)
        self.assertIn('access', res_verify.data['tokens'])

    def test_password_reset_with_otp(self):
        """Verify password reset via Redis OTP."""
        res_send = self.client.post('/api/auth/otp/send/', {'email': self.email, 'purpose': 'reset_password'}, format='json')
        otp_code = res_send.data['dev_otp']

        res_reset = self.client.post('/api/auth/otp/reset-password/', {
            'email': self.email,
            'otp': otp_code,
            'new_password': 'brandnewpassword123'
        }, format='json')
        self.assertEqual(res_reset.status_code, status.HTTP_200_OK)

        # Verify new password works
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('brandnewpassword123'))


class SuperAdminAndRBACTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create Super Admin owner
        self.super_admin = User.objects.create_user(
            username='Jinkalker_Shiva',
            email='jinkalkers@gmail.com',
            password='Password123!',
            first_name='Shiva',
            last_name='Jinkalker',
            is_staff=True,
            is_superuser=True
        )
        self.owner_profile, _ = UserProfile.objects.get_or_create(user=self.super_admin)
        self.owner_profile.preferences = {
            'role': 'ROLE_SUPER_ADMIN',
            'roles': ['ROLE_SUPER_ADMIN'],
            'status': 'ACTIVE'
        }
        self.owner_profile.save()

        # Create Regular Admin
        self.admin_user = User.objects.create_user(
            username='staff_admin_test',
            email='staff_admin_test@econext.org',
            password='Password123!',
            first_name='Regular',
            last_name='Admin',
            is_staff=True,
            is_superuser=False
        )
        self.admin_profile, _ = UserProfile.objects.get_or_create(user=self.admin_user)
        self.admin_profile.preferences = {
            'role': 'ROLE_ADMIN',
            'roles': ['ROLE_ADMIN'],
            'status': 'ACTIVE'
        }
        self.admin_profile.save()

        # Create Driver Staff
        self.driver_user = User.objects.create_user(
            username='driver_demo',
            email='driver@econext.org',
            password='Password123!',
            first_name='Dev',
            last_name='Driver',
            is_staff=True,
            is_superuser=False
        )
        self.driver_profile, _ = UserProfile.objects.get_or_create(user=self.driver_user)
        self.driver_profile.preferences = {
            'role': 'ROLE_DRIVER',
            'roles': ['ROLE_DRIVER'],
            'status': 'ACTIVE'
        }
        self.driver_profile.save()

        # Create Customer
        self.customer = User.objects.create_user(
            username='normal_customer',
            email='customer@example.com',
            password='Password123!'
        )

    def set_jwt(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')

    def test_assign_super_admin_command(self):
        """Verify assign_super_admin command enforces platform owner Super Admin status."""
        from django.core.management import call_command
        call_command('assign_super_admin', username='Jinkalker_Shiva')
        self.super_admin.refresh_from_db()
        self.assertTrue(self.super_admin.is_staff)
        self.assertTrue(self.super_admin.is_superuser)

        self.set_jwt(self.super_admin)
        res = self.client.get('/api/admin/auth/me/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['data']['isSuperAdmin'])
        self.assertEqual(res.data['data']['role'], 'ROLE_SUPER_ADMIN')

    def test_seed_demo_staff_idempotency(self):
        """Verify seed_demo_staff creates exactly one account per role and running twice produces zero duplicates."""
        from django.core.management import call_command
        call_command('seed_demo_staff')
        call_command('seed_demo_staff')

        # Check expected accounts covering all operational departments
        usernames = [
            'Jinkalker_Shiva', 'admin', 'warehouse_demo', 'order_demo',
            'fulfillment_demo', 'finance_demo', 'support_demo', 'driver_demo',
            'notifications_demo'
        ]
        for un in usernames:
            self.assertEqual(User.objects.filter(username__iexact=un).count(), 1)


    def test_regular_admin_cannot_modify_or_suspend_super_admin(self):
        """Verify regular admin cannot modify, suspend, or delete the Super Admin."""
        self.set_jwt(self.admin_user)

        # Attempt to modify Super Admin
        res_patch = self.client.patch(f'/api/admin/staff/{self.super_admin.id}/', {'name': 'Hacked Super Admin'}, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Regular administrators cannot modify the Super Admin account', res_patch.data.get('message', ''))

        # Attempt to suspend Super Admin via status endpoint
        res_status = self.client.patch(f'/api/admin/staff/{self.super_admin.id}/status/', {'status': 'SUSPENDED'}, format='json')
        self.assertEqual(res_status.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be suspended', res_status.data.get('message', ''))

        # Attempt to delete Super Admin
        res_delete = self.client.delete(f'/api/admin/staff/{self.super_admin.id}/')
        self.assertEqual(res_delete.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be deleted', res_delete.data.get('message', ''))

    def test_regular_admin_cannot_provision_or_escalate_to_super_admin(self):
        """Verify regular admin cannot create or promote an account to ROLE_SUPER_ADMIN."""
        self.set_jwt(self.admin_user)

        # Attempt to create new staff as ROLE_SUPER_ADMIN
        res_create = self.client.post('/api/admin/staff/', {
            'username': 'fake_super_admin',
            'name': 'Fake Super Admin',
            'email': 'fake_super@econext.org',
            'password': 'TempPassword123!',
            'roleName': 'ROLE_SUPER_ADMIN'
        }, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Only the Super Admin can provision another Super Admin', res_create.data.get('message', ''))

        # Attempt to promote existing staff to ROLE_SUPER_ADMIN
        res_promote = self.client.patch(f'/api/admin/staff/{self.driver_user.id}/', {
            'roleName': 'ROLE_SUPER_ADMIN'
        }, format='json')
        self.assertEqual(res_promote.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Only the Super Admin may assign the Super Admin role', res_promote.data.get('message', ''))

    def test_driver_task_endpoint_isolation_and_updates(self):
        """Verify Driver role can access task feed and update status, while isolated from financial data."""
        from decimal import Decimal
        from order_service.models import Order, Shipment
        # Create an Order and Shipment
        order = Order.objects.create(
            user=self.customer,
            total_price=Decimal('1500.00'),
            recipient_name='Test Recipient',
            phone='9876543210',
            shipping_address='Flat 402, Green Valley Apartments',
            city='Mumbai',
            state='Maharashtra',
            zipcode='400001',
            status='IN_TRANSIT'
        )
        shipment = Shipment.objects.create(
            order=order,
            shipment_number='SHP-990011',
            status='IN_TRANSIT'
        )

        # Test Driver gets task feed
        self.set_jwt(self.driver_user)
        res_tasks = self.client.get('/api/driver/tasks/')
        self.assertEqual(res_tasks.status_code, status.HTTP_200_OK)
        self.assertIn('deliveries', res_tasks.data['data'])
        delivery_item = next((d for d in res_tasks.data['data']['deliveries'] if d['id'] == shipment.id), None)
        self.assertIsNotNone(delivery_item)
        # Verify strict isolation: no sensitive payment data in task item
        self.assertNotIn('payment_method', delivery_item)
        self.assertNotIn('card_number', delivery_item)

        # Driver updates delivery status to DELIVERED
        res_update = self.client.post(f'/api/driver/tasks/{shipment.id}/status/', {
            'type': 'DELIVERY',
            'status': 'DELIVERED',
            'notes': 'Handed over to customer at door.'
        }, format='json')
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        shipment.refresh_from_db()
        self.assertEqual(shipment.status, 'DELIVERED')
        order.refresh_from_db()
        self.assertEqual(order.status, 'DELIVERED')

        # Test non-driver / customer cannot access driver feed
        self.set_jwt(self.customer)
        res_cust = self.client.get('/api/driver/tasks/')
        self.assertEqual(res_cust.status_code, status.HTTP_403_FORBIDDEN)

    def test_rbac_denial_for_unauthorized_endpoints(self):
        """Verify driver and customer are denied access to staff governance, finance payout, and return inspection."""
        # Driver cannot access staff directory
        self.set_jwt(self.driver_user)
        res_staff = self.client.get('/api/admin/staff/')
        self.assertEqual(res_staff.status_code, status.HTTP_403_FORBIDDEN)

        # Driver cannot record COD payout
        res_payout = self.client.post('/api/admin/refunds/99999/payout/', {
            'payout_reference': 'CASH-001'
        }, format='json')
        self.assertEqual(res_payout.status_code, status.HTTP_403_FORBIDDEN)

        # Customer cannot view audit logs
        self.set_jwt(self.customer)
        res_audit = self.client.get('/api/admin/audit/')
        self.assertEqual(res_audit.status_code, status.HTTP_403_FORBIDDEN)

    def test_departments_catalog_api(self):
        """Verify GET /api/admin/departments/ returns all 9 operational departments."""
        self.set_jwt(self.super_admin)
        res = self.client.get('/api/admin/departments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        departments = res.data.get('data', [])
        self.assertEqual(len(departments), 9)
        dept_names = [d['name'] for d in departments]
        self.assertIn('Administration', dept_names)
        self.assertIn('Inventory/Warehouse', dept_names)
        self.assertIn('Order Management', dept_names)
        self.assertIn('Fulfillment/Logistics', dept_names)
        self.assertIn('Driver/Fleet', dept_names)
        self.assertIn('Finance/Payments', dept_names)
        self.assertIn('Customer Support', dept_names)
        self.assertIn('Notifications/Communications', dept_names)
        self.assertIn('Platform Governance', dept_names)

    def test_provision_staff_with_department_and_validation(self):
        """Verify staff provisioning validates password length, duplicates, and preserves department."""
        self.set_jwt(self.super_admin)

        # 1. Password too short (< 8 chars)
        res_short_pw = self.client.post('/api/admin/staff/', {
            'username': 'short_pw_user',
            'name': 'Short PW',
            'email': 'short@econext.org',
            'password': '123',
            'department': 'Customer Support',
            'roleName': 'ROLE_SUPPORT'
        }, format='json')
        self.assertEqual(res_short_pw.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('at least 8 characters', res_short_pw.data.get('message', ''))

        # 2. Valid creation
        res_valid = self.client.post('/api/admin/staff/', {
            'username': 'valid_support_rep',
            'name': 'Valid Support Rep',
            'email': 'valid_rep@econext.org',
            'password': 'SecurePassword123!',
            'department': 'Customer Support',
            'roleName': 'ROLE_SUPPORT',
            'status': 'ACTIVE'
        }, format='json')
        self.assertEqual(res_valid.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_valid.data['data']['department'], 'Customer Support')
        self.assertEqual(res_valid.data['data']['roleName'], 'ROLE_SUPPORT')
        self.assertEqual(res_valid.data['data']['status'], 'ACTIVE')

        # 3. Duplicate username
        res_dup = self.client.post('/api/admin/staff/', {
            'username': 'valid_support_rep',
            'name': 'Duplicate Rep',
            'email': 'another_rep@econext.org',
            'password': 'SecurePassword123!',
            'department': 'Customer Support',
            'roleName': 'ROLE_SUPPORT'
        }, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already taken', res_dup.data.get('message', ''))

    def test_staff_directory_includes_department(self):
        """Verify GET /api/admin/staff/ returns department for all staff members."""
        self.set_jwt(self.super_admin)
        res = self.client.get('/api/admin/staff/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        staff_list = res.data.get('data', [])
        self.assertGreater(len(staff_list), 0)
        for staff in staff_list:
            self.assertIn('department', staff)
            self.assertTrue(bool(staff['department']))

    def test_update_staff_department_and_role(self):
        """Verify updating a staff member's department and role via PATCH."""
        self.set_jwt(self.super_admin)
        res_patch = self.client.patch(f'/api/admin/staff/{self.driver_user.id}/', {
            'department': 'Fulfillment/Logistics',
            'roleName': 'ROLE_FULFILLMENT'
        }, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data['data']['department'], 'Fulfillment/Logistics')
        self.assertEqual(res_patch.data['data']['roleName'], 'ROLE_FULFILLMENT')

    def test_access_token_expiry_returns_401(self):
        """Verify expired or malformed access token returns HTTP 401 token_not_valid."""
        expired_token = (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            "eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxMDAwMDAwMDAwLCJqdGkiOiJleHBpcmVkX2p0aSJ9."
            "invalid_signature_here"
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {expired_token}')
        res = self.client.get('/api/admin/staff/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue('token' in res.data.get('message', '').lower() or 'credentials' in res.data.get('message', '').lower())

    def test_dual_jwt_accepts_spring_microservice_token(self):
        """Verify DualJWTAuthentication successfully authenticates Spring Boot microservice JWT tokens."""
        import jwt
        import base64
        from django.conf import settings
        import os

        spring_secret = os.getenv('JWT_SECRET') or os.getenv('JWT_SECRET_KEY') or getattr(settings, 'JWT_SECRET', '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970')
        key = base64.b64decode(spring_secret)
        spring_token = jwt.encode(
            {
                'sub': str(self.admin_user.id),
                'username': self.admin_user.username,
                'email': self.admin_user.email,
                'name': 'Admin Operator',
                'role': 'ROLE_ADMIN',
                'roles': ['ROLE_ADMIN'],
                'permissions': ['STAFF_READ', 'ORDER_READ']
            },
            key,
            algorithm='HS384'
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {spring_token}')
        res = self.client.get('/api/admin/departments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['data']), 9)

        res_staff = self.client.get('/api/admin/staff/')
        self.assertEqual(res_staff.status_code, status.HTTP_200_OK)
        self.assertGreater(len(res_staff.data['data']), 0)

    def test_admin_token_refresh_lifecycle(self):
        """Verify POST /api/admin/auth/refresh/ refreshes access token and rotates refresh token."""
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.super_admin)

        res = self.client.post('/api/admin/auth/refresh/', {
            'refreshToken': str(refresh)
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('accessToken', res.data['data'])
        self.assertIn('refreshToken', res.data['data'])
        self.assertTrue(len(res.data['data']['accessToken']) > 20)

    def test_admin_token_refresh_invalid(self):
        """Verify POST /api/admin/auth/refresh/ rejects invalid refresh token with 401."""
        res = self.client.post('/api/admin/auth/refresh/', {
            'refreshToken': 'totally_bogus_refresh_token'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Invalid or expired refresh token', res.data.get('message', ''))

    def test_unauthenticated_and_unauthorized_staff_directory(self):
        """Verify staff directory returns 401 unauthenticated and 403 unauthorized for non-admin users."""
        # 1. Unauthenticated request -> 401
        self.client.credentials()  # Clear credentials
        res_unauth = self.client.get('/api/admin/staff/')
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Authenticated customer lacking staff permissions -> 403
        self.set_jwt(self.customer)
        res_forbidden = self.client.get('/api/admin/staff/')
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

    def test_department_coverage_and_staff_consistency(self):
        """Verify every operational department has at least one active staff member after seeding."""
        from django.core.management import call_command
        call_command('seed_demo_staff')

        self.set_jwt(self.super_admin)
        res_depts = self.client.get('/api/admin/departments/')
        self.assertEqual(res_depts.status_code, status.HTTP_200_OK)
        dept_names = [d['name'] for d in res_depts.data['data']]

        res_staff = self.client.get('/api/admin/staff/')
        self.assertEqual(res_staff.status_code, status.HTTP_200_OK)
        staff_list = res_staff.data['data']

        active_depts = {s['department'] for s in staff_list if s.get('status') == 'ACTIVE'}
        for dept in dept_names:
            self.assertIn(dept, active_depts, f"Department '{dept}' has 0 active staff members!")
