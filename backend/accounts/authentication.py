import base64
import os
import logging
import jwt
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import authentication
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger(__name__)

class DualJWTAuthentication(authentication.BaseAuthentication):
    """
    Dual JWT Authentication backend supporting:
    1. Standard SimpleJWT tokens issued by Django (customer authentication).
    2. Spring Boot microservice JWT tokens issued by admin-staff-service or auth-service.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.simple_jwt_auth = JWTAuthentication()

    def authenticate_header(self, request):
        """
        Required by DRF so that unauthenticated requests to protected endpoints
        return HTTP 401 Unauthorized with a WWW-Authenticate header instead of HTTP 403 Forbidden.
        """
        return 'Bearer realm="api"'

    def authenticate(self, request):
        header = self.simple_jwt_auth.get_header(request)
        if header is None:
            return None

        raw_token = self.simple_jwt_auth.get_raw_token(header)
        if raw_token is None:
            return None

        # 1. Try standard Django SimpleJWT
        try:
            validated_token = self.simple_jwt_auth.get_validated_token(raw_token)
            user = self.simple_jwt_auth.get_user(validated_token)
            if user:
                return (user, validated_token)
        except Exception:
            pass

        # 2. Try Spring Boot microservice JWT token
        token_str = raw_token.decode('utf-8') if isinstance(raw_token, bytes) else str(raw_token)
        spring_secret = os.getenv('JWT_SECRET') or os.getenv('JWT_SECRET_KEY') or getattr(settings, 'JWT_SECRET', '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970')

        keys_to_try = []
        if len(spring_secret.encode('utf-8')) >= 32:
            keys_to_try.append(spring_secret.encode('utf-8'))
        try:
            b64_decoded = base64.b64decode(spring_secret)
            if len(b64_decoded) >= 32:
                keys_to_try.append(b64_decoded)
        except Exception:
            pass

        for key in keys_to_try:
            try:
                payload = jwt.decode(
                    token_str,
                    key,
                    algorithms=['HS256', 'HS384', 'HS512'],
                    options={'verify_aud': False}
                )
                username = payload.get('username')
                sub = payload.get('sub')
                user = None
                if username:
                    user = User.objects.filter(username__iexact=str(username)).first()
                    if not user:
                        user = User.objects.filter(email__iexact=str(username)).first()
                if not user and sub:
                    if str(sub).isdigit():
                        user = User.objects.filter(id=int(sub)).first()
                    if not user:
                        user = User.objects.filter(username__iexact=str(sub)).first()
                    if not user:
                        user = User.objects.filter(email__iexact=str(sub)).first()

                if not user:
                    target_identifier = username or sub
                    if not target_identifier:
                        continue
                    # Auto-provision staff user if valid admin/staff token
                    role = payload.get('role', '')
                    is_admin_or_staff = any(r in ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'STAFF', 'ADMIN', 'INVENTORY_MANAGER', 'CATALOG_MANAGER', 'ORDER_MANAGER'] for r in [role] + payload.get('roles', []))
                    user, _ = User.objects.get_or_create(
                        username=str(target_identifier),
                        defaults={
                            'email': payload.get('email', f"{target_identifier}@econext.com"),
                            'first_name': payload.get('name', str(target_identifier)),
                            'is_staff': is_admin_or_staff,
                            'is_superuser': role in ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN']
                        }
                    )

                role = payload.get('role', '')
                roles = payload.get('roles', [role] if role else [])
                if any(r in ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'STAFF', 'ADMIN', 'INVENTORY_MANAGER', 'CATALOG_MANAGER', 'ORDER_MANAGER'] for r in roles):
                    if not user.is_staff:
                        user.is_staff = True
                        user.save(update_fields=['is_staff'])

                return (user, payload)
            except jwt.PyJWTError:
                continue
            except Exception as ex:
                logger.debug("Error decoding Spring JWT token: %s", ex)
                continue

        return None
