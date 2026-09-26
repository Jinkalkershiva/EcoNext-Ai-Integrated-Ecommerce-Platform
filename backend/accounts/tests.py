from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.otp_service import RedisOTPService

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
