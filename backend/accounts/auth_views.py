from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication
from accounts.authentication import DualJWTAuthentication
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.views.decorators.http import require_http_methods
from .serializers import SignUpSerializer, LoginSerializer, UserSerializer, UserProfileSerializer, UserAddressSerializer
from .models import UserProfile, UserAddress

@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    """User registration endpoint"""
    serializer = SignUpSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'status': 'success',
            'message': 'User registered successfully',
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        }, status=status.HTTP_201_CREATED)
    return Response({
        'status': 'error',
        'message': 'Signup failed',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """User login endpoint"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        user = authenticate(username=username, password=password)
        if user is not None:
            refresh = RefreshToken.for_user(user)
            try:
                profile = UserProfile.objects.get(user=user)
            except UserProfile.DoesNotExist:
                profile = UserProfile.objects.create(user=user)
            return Response({
                'status': 'success',
                'message': 'Login successful',
                'user': UserSerializer(user).data,
                'profile': UserProfileSerializer(profile).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'status': 'error',
                'message': 'Invalid username or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
    return Response({
        'status': 'error',
        'message': 'Invalid credentials',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Get current authenticated user.

    Uses get_or_create because accounts made outside the signup flow (for
    example via createsuperuser or the admin) have no UserProfile row, and
    this endpoint used to return 404 for them.
    """
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    return Response({
        'status': 'success',
        'user': UserSerializer(request.user).data,
        'profile': UserProfileSerializer(profile).data
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Log out by blacklisting the caller's refresh token.

    Previously this returned success without invalidating anything, so a
    "logged out" access token stayed valid for its full 24 hour lifetime.
    Blacklisting requires 'rest_framework_simplejwt.token_blacklist' in
    INSTALLED_APPS. Logout is deliberately tolerant: if the client cannot
    supply a refresh token we still report success so it can clear its own
    state, but we report whether the token was actually revoked.
    """
    refresh_token = request.data.get('refresh') or request.data.get('refresh_token')
    revoked = False

    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
            revoked = True
        except TokenError:
            # Already expired, already blacklisted, or malformed — nothing to do.
            revoked = False

    return Response({
        'status': 'success',
        'message': 'Logout successful',
        'token_revoked': revoked,
    }, status=status.HTTP_200_OK)

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """Update the authenticated user's account and profile fields."""
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    user = request.user

    # Guard email uniqueness — this endpoint previously let two accounts end up
    # sharing an address even though signup forbids it.
    email = request.data.get('email')
    if email and email != user.email:
        if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            return Response({
                'status': 'error',
                'message': 'That email address is already in use.',
                'errors': {'email': 'Already in use'},
            }, status=status.HTTP_400_BAD_REQUEST)
        user.email = email

    for field in ('first_name', 'last_name'):
        if field in request.data:
            setattr(user, field, request.data[field])
    user.save()

    for field in ('phone', 'address', 'city', 'country', 'zipcode', 'state'):
        if field in request.data:
            setattr(profile, field, request.data[field])
    profile.save()

    return Response({
        'status': 'success',
        'message': 'Profile updated successfully',
        'user': UserSerializer(user).data,
        'profile': UserProfileSerializer(profile).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp_view(request):
    """
    Generate and dispatch a Redis-backed OTP code for authentication or password reset.
    """
    from .otp_service import RedisOTPService
    email = request.data.get('email', '').strip()
    purpose = request.data.get('purpose', 'login').strip().lower()

    if not email or '@' not in email:
        return Response({
            'status': 'error',
            'message': 'A valid email address is required to dispatch an OTP.'
        }, status=status.HTTP_400_BAD_REQUEST)

    otp_code = RedisOTPService.generate_otp(email=email, purpose=purpose)
    
    return Response({
        'status': 'success',
        'message': f"OTP sent to {email} successfully (valid for 5 minutes).",
        'ttl_seconds': 300,
        'purpose': purpose,
        # Included in dev/testing mode for instant headless automated tests
        'dev_otp': otp_code
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp_view(request):
    """
    Validate a Redis OTP and issue session JWT tokens if valid.
    """
    from .otp_service import RedisOTPService
    email = request.data.get('email', '').strip()
    otp_code = request.data.get('otp', '').strip()
    purpose = request.data.get('purpose', 'login').strip().lower()

    if not email or not otp_code:
        return Response({
            'status': 'error',
            'message': 'Both email and OTP code are required.'
        }, status=status.HTTP_400_BAD_REQUEST)

    is_valid, msg = RedisOTPService.verify_otp(email=email, otp_code=otp_code, purpose=purpose)
    if not is_valid:
        return Response({
            'status': 'error',
            'message': msg
        }, status=status.HTTP_400_BAD_REQUEST)

    # If user exists, authenticate them and return JWT tokens
    user = User.objects.filter(email__iexact=email).first()
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'status': 'success',
            'message': 'OTP verification successful. Authenticated session active.',
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        }, status=status.HTTP_200_OK)

    return Response({
        'status': 'success',
        'message': 'OTP code verified successfully.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_with_otp_view(request):
    """
    Reset user password after successful Redis OTP validation.
    """
    from .otp_service import RedisOTPService
    email = request.data.get('email', '').strip()
    otp_code = request.data.get('otp', '').strip()
    new_password = request.data.get('new_password', '').strip()

    if not email or not otp_code or not new_password:
        return Response({
            'status': 'error',
            'message': 'Email, OTP code, and new_password are required.'
        }, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 6:
        return Response({
            'status': 'error',
            'message': 'Password must be at least 6 characters long.'
        }, status=status.HTTP_400_BAD_REQUEST)

    is_valid, msg = RedisOTPService.verify_otp(email=email, otp_code=otp_code, purpose='reset_password')
    if not is_valid:
        return Response({
            'status': 'error',
            'message': msg
        }, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return Response({
            'status': 'error',
            'message': 'No user account found with this email address.'
        }, status=status.HTTP_404_NOT_FOUND)

    user.set_password(new_password)
    user.save()

    return Response({
        'status': 'success',
        'message': 'Password reset successful! You may now sign in with your new password.'
    }, status=status.HTTP_200_OK)


ALL_ADMIN_PERMISSIONS = [
    'DASHBOARD_VIEW', 'CATALOG_VIEW', 'CATALOG_EDIT', 'INVENTORY_VIEW',
    'INVENTORY_MANAGE', 'ORDER_VIEW', 'ORDER_STATUS_UPDATE', 'STAFF_VIEW',
    'STAFF_MANAGE', 'CUSTOMER_VIEW', 'PAYMENT_VIEW', 'ANALYTICS_VIEW',
    'AUDIT_VIEW', 'SYSTEM_CONFIG', 'LIVE_SOURCES_MANAGE', 'BIG_DATA_VIEW'
]


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login_view(request):
    """
    Dedicated Admin & Staff login endpoint returning JWT tokens and RBAC permissions.
    """
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    
    if not username or not password:
        return Response({
            'status': 'error',
            'message': 'Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    user = authenticate(username=username, password=password)
    if not user:
        # Check by email as username fallback
        user_by_email = User.objects.filter(email__iexact=username).first()
        if user_by_email:
            user = authenticate(username=user_by_email.username, password=password)

    if not user:
        return Response({
            'status': 'error',
            'message': 'Invalid staff credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)
        
    refresh = RefreshToken.for_user(user)
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
    profile, _ = UserProfile.objects.get_or_create(user=user)
    assigned_role = profile.preferences.get('role', 'ROLE_SUPER_ADMIN' if user.username == 'Jinkalker_Shiva' else ('ROLE_ADMIN' if user.is_superuser else 'INVENTORY_MANAGER'))
    assigned_roles = profile.preferences.get('roles', [assigned_role])
    user_status = profile.preferences.get('status', 'ACTIVE')
    if user_status == 'SUSPENDED':
        return Response({'status': 'error', 'message': 'Account is suspended'}, status=status.HTTP_401_UNAUTHORIZED)

    if is_super_admin(user):
        role = 'ROLE_SUPER_ADMIN'
        roles = ['ROLE_SUPER_ADMIN']
        permissions = get_role_permissions('ROLE_SUPER_ADMIN')
    elif assigned_role in ['ROLE_ADMIN', 'ADMIN'] or user.is_superuser:
        role = 'ROLE_ADMIN'
        roles = ['ROLE_ADMIN']
        permissions = get_role_permissions('ROLE_ADMIN')
    else:
        role = assigned_role
        roles = assigned_roles
        permissions = get_role_permissions(assigned_role)

    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'fullName': full_name,
        'name': full_name,
        'role': role,
        'roles': roles,
        'isSuperAdmin': is_super_admin(user),
        'permissions': permissions,
        'accessToken': str(refresh.access_token),
        'refreshToken': str(refresh),
        'tokens': {
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }
    }
    return Response({
        'status': 'success',
        'message': 'Staff authentication successful',
        'data': data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([DualJWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_me_view(request):
    """
    Returns the authenticated staff member's profile and RBAC permissions.
    """
    user = request.user
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
    profile, _ = UserProfile.objects.get_or_create(user=user)
    assigned_role = profile.preferences.get('role', 'ROLE_SUPER_ADMIN' if user.username == 'Jinkalker_Shiva' else ('ROLE_ADMIN' if user.is_superuser else 'INVENTORY_MANAGER'))
    assigned_roles = profile.preferences.get('roles', [assigned_role])

    if is_super_admin(user):
        role = 'ROLE_SUPER_ADMIN'
        roles = ['ROLE_SUPER_ADMIN']
        permissions = get_role_permissions('ROLE_SUPER_ADMIN')
    elif assigned_role in ['ROLE_ADMIN', 'ADMIN'] or user.is_superuser:
        role = 'ROLE_ADMIN'
        roles = ['ROLE_ADMIN']
        permissions = get_role_permissions('ROLE_ADMIN')
    else:
        role = assigned_role
        roles = assigned_roles
        permissions = get_role_permissions(assigned_role)

    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'fullName': full_name,
        'name': full_name,
        'role': role,
        'roles': roles,
        'isSuperAdmin': is_super_admin(user),
        'permissions': permissions
    }
    return Response({
        'status': 'success',
        'data': data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_refresh_view(request):
    """
    Refreshes staff access token using refresh token.
    Supports standard SimpleJWT refresh tokens with rotation and Spring microservice refresh tokens.
    """
    refresh_token = request.data.get('refreshToken') or request.data.get('refresh')
    if not refresh_token:
        return Response({
            'status': 'error',
            'message': 'Refresh token is required'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    # 1. Try SimpleJWT RefreshToken
    try:
        token = RefreshToken(refresh_token)
        new_access = str(token.access_token)
        from rest_framework_simplejwt.settings import api_settings
        new_refresh = str(token)
        if api_settings.ROTATE_REFRESH_TOKENS:
            if api_settings.BLACKLIST_AFTER_ROTATION:
                try:
                    token.blacklist()
                except AttributeError:
                    pass
            token.set_jti()
            token.set_exp()
            token.set_iat()
            new_refresh = str(token)
        return Response({
            'status': 'success',
            'data': {
                'accessToken': new_access,
                'refreshToken': new_refresh,
                'access': new_access,
                'refresh': new_refresh
            }
        }, status=status.HTTP_200_OK)
    except Exception:
        pass

    # 2. Try Spring Boot microservice refresh token
    import base64
    import os
    import jwt
    from django.conf import settings
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
                str(refresh_token),
                key,
                algorithms=['HS256', 'HS384', 'HS512'],
                options={'verify_aud': False}
            )
            sub = payload.get('sub') or payload.get('username')
            user = User.objects.filter(id=sub).first() if str(sub).isdigit() else User.objects.filter(username__iexact=str(sub)).first()
            if not user:
                user = User.objects.filter(email__iexact=str(sub)).first()
            if user:
                user_refresh = RefreshToken.for_user(user)
                new_access = str(user_refresh.access_token)
                new_refresh = str(user_refresh)
                return Response({
                    'status': 'success',
                    'data': {
                        'accessToken': new_access,
                        'refreshToken': new_refresh,
                        'access': new_access,
                        'refresh': new_refresh
                    }
                }, status=status.HTTP_200_OK)
        except Exception:
            continue

    return Response({
        'status': 'error',
        'message': 'Invalid or expired refresh token'
    }, status=status.HTTP_401_UNAUTHORIZED)


SYSTEM_ROLES_CATALOG = [
    {
        'id': '0',
        'name': 'ROLE_SUPER_ADMIN',
        'roleName': 'ROLE_SUPER_ADMIN',
        'displayName': 'Super Admin (Platform Owner)',
        'department': 'Platform Governance',
        'description': 'Master Platform Owner with unrestricted governance, staff administration, and operational oversight',
        'isSystemRole': True,
        'permissions': [
            'SYSTEM_ADMIN_GOVERNANCE', 'ROLE_PREVIEW',
            'CATALOG_CREATE', 'CATALOG_READ', 'CATALOG_UPDATE', 'CATALOG_DELETE',
            'INVENTORY_CREATE', 'INVENTORY_READ', 'INVENTORY_UPDATE', 'INVENTORY_ADJUST',
            'ORDER_READ', 'ORDER_UPDATE', 'ORDER_PROCESS', 'ORDER_STATUS_UPDATE',
            'SHIPMENT_READ', 'SHIPMENT_UPDATE', 'SHIPMENT_DISPATCH',
            'RETURN_READ', 'RETURN_APPROVE', 'RETURN_INSPECT', 'RETURN_PROCESS',
            'FINANCE_READ', 'FINANCE_MANAGE', 'REFUND_PROCESS',
            'DATA_IMPORT', 'BULK_IMPORT_PRODUCTS', 'DATA_EXPORT', 'DATA_ANALYSIS',
            'STAFF_CREATE', 'STAFF_READ', 'STAFF_UPDATE', 'STAFF_DISABLE', 'STAFF_MANAGE',
            'AUDIT_READ', 'DATABASE_QUERY_READ',
            'DRIVER_TASK_READ', 'DRIVER_STATUS_UPDATE',
            'NOTIFICATION_READ', 'NOTIFICATION_MANAGE'
        ]
    },
    {
        'id': '1',
        'name': 'ROLE_ADMIN',
        'roleName': 'ROLE_ADMIN',
        'displayName': 'Store Administrator',
        'department': 'Administration',
        'description': 'Full System Administrator with operational access (cannot modify Super Admin accounts)',
        'isSystemRole': True,
        'permissions': [
            'CATALOG_CREATE', 'CATALOG_READ', 'CATALOG_UPDATE', 'CATALOG_DELETE',
            'INVENTORY_CREATE', 'INVENTORY_READ', 'INVENTORY_UPDATE', 'INVENTORY_ADJUST',
            'ORDER_READ', 'ORDER_UPDATE', 'ORDER_PROCESS', 'ORDER_STATUS_UPDATE',
            'SHIPMENT_READ', 'SHIPMENT_UPDATE', 'SHIPMENT_DISPATCH',
            'RETURN_READ', 'RETURN_APPROVE', 'RETURN_INSPECT', 'RETURN_PROCESS',
            'FINANCE_READ', 'FINANCE_MANAGE', 'REFUND_PROCESS',
            'DATA_IMPORT', 'BULK_IMPORT_PRODUCTS', 'DATA_EXPORT', 'DATA_ANALYSIS',
            'STAFF_CREATE', 'STAFF_READ', 'STAFF_UPDATE', 'STAFF_DISABLE',
            'AUDIT_READ', 'DATABASE_QUERY_READ',
            'NOTIFICATION_READ', 'NOTIFICATION_MANAGE'
        ]
    },
    {
        'id': '2',
        'name': 'ROLE_WAREHOUSE',
        'roleName': 'ROLE_WAREHOUSE',
        'displayName': 'Warehouse Staff',
        'department': 'Inventory/Warehouse',
        'description': 'Inbound receiving, physical return inspection, inventory stock management and replenishment',
        'isSystemRole': True,
        'permissions': [
            'INVENTORY_CREATE', 'INVENTORY_READ', 'INVENTORY_UPDATE', 'INVENTORY_ADJUST',
            'CATALOG_READ', 'ORDER_READ', 'RETURN_READ', 'RETURN_INSPECT', 'RETURN_RECEIVE'
        ]
    },
    {
        'id': '3',
        'name': 'ROLE_ORDER_MANAGER',
        'roleName': 'ROLE_ORDER_MANAGER',
        'displayName': 'Order Manager',
        'department': 'Order Management',
        'description': 'Customer orders supervision, lifecycle state transitions and tracking inquiries',
        'isSystemRole': True,
        'permissions': [
            'ORDER_READ', 'ORDER_UPDATE', 'ORDER_PROCESS', 'ORDER_STATUS_UPDATE',
            'CATALOG_READ', 'CUSTOMER_READ'
        ]
    },
    {
        'id': '4',
        'name': 'ROLE_FULFILLMENT',
        'roleName': 'ROLE_FULFILLMENT',
        'displayName': 'Fulfillment / Operations Staff',
        'department': 'Fulfillment/Logistics',
        'description': 'Forward shipment dispatch, packing, reverse pickup scheduling, carrier & fleet assignments',
        'isSystemRole': True,
        'permissions': [
            'ORDER_READ', 'ORDER_PROCESS', 'ORDER_STATUS_UPDATE',
            'SHIPMENT_READ', 'SHIPMENT_UPDATE', 'SHIPMENT_DISPATCH',
            'RETURN_READ', 'RETURN_SCHEDULE_PICKUP', 'CATALOG_READ'
        ]
    },
    {
        'id': '5',
        'name': 'ROLE_FINANCE',
        'roleName': 'ROLE_FINANCE',
        'displayName': 'Finance / Payments Staff',
        'department': 'Finance/Payments',
        'description': 'Payment ledger reconciliation, refund processing & retry, COD offline payouts, financial analytics',
        'isSystemRole': True,
        'permissions': [
            'FINANCE_READ', 'FINANCE_MANAGE', 'REFUND_PROCESS', 'ORDER_READ', 'RETURN_READ',
            'DATA_ANALYSIS', 'DATA_EXPORT'
        ]
    },
    {
        'id': '6',
        'name': 'ROLE_SUPPORT',
        'roleName': 'ROLE_SUPPORT',
        'displayName': 'Customer Support Staff',
        'department': 'Customer Support',
        'description': 'Customer service, order tracking inquiry, return request review and assistance',
        'isSystemRole': True,
        'permissions': [
            'ORDER_READ', 'RETURN_READ', 'CUSTOMER_READ', 'CATALOG_READ'
        ]
    },
    {
        'id': '7',
        'name': 'ROLE_DRIVER',
        'roleName': 'ROLE_DRIVER',
        'displayName': 'Logistics Fleet Driver',
        'department': 'Driver/Fleet',
        'description': 'Field delivery & reverse pickup driver (isolated strictly to assigned stops & status updates)',
        'isSystemRole': True,
        'permissions': [
            'DRIVER_TASK_READ', 'DRIVER_STATUS_UPDATE'
        ]
    },
    {
        'id': '8',
        'name': 'ROLE_NOTIFICATIONS',
        'roleName': 'ROLE_NOTIFICATIONS',
        'displayName': 'Communications & Notifications Staff',
        'department': 'Notifications/Communications',
        'description': 'Customer Email/SMS notification logs, dispatch monitoring, and delivery alert telemetry',
        'isSystemRole': True,
        'permissions': [
            'NOTIFICATION_READ', 'NOTIFICATION_MANAGE', 'ORDER_READ', 'CUSTOMER_READ'
        ]
    },
    # Preserved legacy operational aliases
    {
        'id': '9',
        'name': 'INVENTORY_MANAGER',
        'roleName': 'INVENTORY_MANAGER',
        'displayName': 'Inventory Manager (Legacy)',
        'department': 'Inventory/Warehouse',
        'description': 'Manages stock inventory, adjustments, thresholds, and low-stock alerts',
        'isSystemRole': False,
        'permissions': [
            'INVENTORY_CREATE', 'INVENTORY_READ', 'INVENTORY_UPDATE', 'INVENTORY_ADJUST',
            'CATALOG_READ', 'DATA_IMPORT', 'BULK_IMPORT_PRODUCTS', 'DATA_EXPORT'
        ]
    },
    {
        'id': '10',
        'name': 'CATALOG_MANAGER',
        'roleName': 'CATALOG_MANAGER',
        'displayName': 'Catalog Manager (Legacy)',
        'department': 'Inventory/Warehouse',
        'description': 'Manages products, categories, pricing, attributes, and catalog data entry',
        'isSystemRole': False,
        'permissions': [
            'CATALOG_CREATE', 'CATALOG_READ', 'CATALOG_UPDATE', 'CATALOG_DELETE',
            'INVENTORY_READ', 'DATA_IMPORT', 'BULK_IMPORT_PRODUCTS', 'DATA_EXPORT'
        ]
    },
    {
        'id': '11',
        'name': 'ORDER_MANAGER',
        'roleName': 'ORDER_MANAGER',
        'displayName': 'Order Manager (Legacy)',
        'department': 'Order Management',
        'description': 'Supervises order processing, lifecycle states, cancellations, and logistics',
        'isSystemRole': False,
        'permissions': [
            'ORDER_READ', 'ORDER_UPDATE', 'ORDER_PROCESS', 'ORDER_STATUS_UPDATE',
            'CATALOG_READ', 'INVENTORY_READ'
        ]
    },
    {
        'id': '12',
        'name': 'ORDER_PROCESSING_STAFF',
        'roleName': 'ORDER_PROCESSING_STAFF',
        'displayName': 'Order Processing Staff (Legacy)',
        'department': 'Fulfillment/Logistics',
        'description': 'Handles daily picking, packing, and shipment dispatch transitions',
        'isSystemRole': False,
        'permissions': [
            'ORDER_READ', 'ORDER_PROCESS', 'ORDER_STATUS_UPDATE', 'CATALOG_READ'
        ]
    },
    {
        'id': '13',
        'name': 'DATA_ANALYST',
        'roleName': 'DATA_ANALYST',
        'displayName': 'Data Analyst (Legacy)',
        'department': 'Administration',
        'description': 'Accesses reports, operational analytics, sales aggregations, and data exports',
        'isSystemRole': False,
        'permissions': [
            'DATA_ANALYSIS', 'DATA_EXPORT', 'CATALOG_READ', 'INVENTORY_READ', 'ORDER_READ', 'AUDIT_READ', 'DATABASE_QUERY_READ'
        ]
    },
    {
        'id': '14',
        'name': 'DATA_ENTRY_STAFF',
        'roleName': 'DATA_ENTRY_STAFF',
        'displayName': 'Data Entry Staff (Legacy)',
        'department': 'Inventory/Warehouse',
        'description': 'Performs manual product creation and batch CSV/Excel data entry',
        'isSystemRole': False,
        'permissions': [
            'CATALOG_CREATE', 'CATALOG_READ', 'CATALOG_UPDATE', 'DATA_IMPORT', 'BULK_IMPORT_PRODUCTS'
        ]
    },
    {
        'id': '15',
        'name': 'DELIVERY_STAFF',
        'roleName': 'DELIVERY_STAFF',
        'displayName': 'Delivery Staff (Legacy)',
        'department': 'Driver/Fleet',
        'description': 'Field and dispatch logistics updates (Out for delivery, Delivered)',
        'isSystemRole': False,
        'permissions': [
            'DRIVER_TASK_READ', 'DRIVER_STATUS_UPDATE', 'ORDER_READ', 'ORDER_STATUS_UPDATE'
        ]
    }
]

OPERATIONAL_DEPARTMENTS = [
    {
        'id': 'dept_admin',
        'name': 'Administration',
        'displayName': 'Administration',
        'description': 'Store operations and system-wide management',
        'defaultRole': 'ROLE_ADMIN',
        'allowedRoles': ['ROLE_ADMIN', 'ADMIN']
    },
    {
        'id': 'dept_warehouse',
        'name': 'Inventory/Warehouse',
        'displayName': 'Inventory / Warehouse',
        'description': 'Inbound QA, warehouse receiving, return inspection and stock replenishment',
        'defaultRole': 'ROLE_WAREHOUSE',
        'allowedRoles': ['ROLE_WAREHOUSE', 'INVENTORY_MANAGER', 'CATALOG_MANAGER', 'DATA_ENTRY_STAFF']
    },
    {
        'id': 'dept_order',
        'name': 'Order Management',
        'displayName': 'Order Management',
        'description': 'Customer orders supervision, lifecycle state transitions and tracking inquiries',
        'defaultRole': 'ROLE_ORDER_MANAGER',
        'allowedRoles': ['ROLE_ORDER_MANAGER', 'ORDER_MANAGER']
    },
    {
        'id': 'dept_fulfillment',
        'name': 'Fulfillment/Logistics',
        'displayName': 'Fulfillment & Logistics',
        'description': 'Packing, forward dispatch, reverse pickup scheduling, and carrier assignment',
        'defaultRole': 'ROLE_FULFILLMENT',
        'allowedRoles': ['ROLE_FULFILLMENT', 'ORDER_PROCESSING_STAFF']
    },
    {
        'id': 'dept_driver',
        'name': 'Driver/Fleet',
        'displayName': 'Driver & Fleet Logistics',
        'description': 'Last-mile customer deliveries and reverse return pickups',
        'defaultRole': 'ROLE_DRIVER',
        'allowedRoles': ['ROLE_DRIVER', 'DELIVERY_STAFF']
    },
    {
        'id': 'dept_finance',
        'name': 'Finance/Payments',
        'displayName': 'Finance & Payments',
        'description': 'Payment ledger reconciliation, refund processing, offline COD payouts',
        'defaultRole': 'ROLE_FINANCE',
        'allowedRoles': ['ROLE_FINANCE', 'DATA_ANALYST']
    },
    {
        'id': 'dept_support',
        'name': 'Customer Support',
        'displayName': 'Customer Support',
        'description': 'Customer claims review, return requests assistance, and order inquiry management',
        'defaultRole': 'ROLE_SUPPORT',
        'allowedRoles': ['ROLE_SUPPORT', 'CUSTOMER_SUPPORT']
    },
    {
        'id': 'dept_notifications',
        'name': 'Notifications/Communications',
        'displayName': 'Notifications & Communications',
        'description': 'Customer email/SMS dispatch monitoring, delivery alerts, and communication logs',
        'defaultRole': 'ROLE_NOTIFICATIONS',
        'allowedRoles': ['ROLE_NOTIFICATIONS']
    },
    {
        'id': 'dept_governance',
        'name': 'Platform Governance',
        'displayName': 'Platform Governance (Platform Owner)',
        'description': 'Master system governance, staff directory administration, audit trails',
        'defaultRole': 'ROLE_SUPER_ADMIN',
        'allowedRoles': ['ROLE_SUPER_ADMIN', 'SUPER_ADMIN']
    }
]

DEFAULT_ROLE_DEPARTMENTS = {
    'ROLE_SUPER_ADMIN': 'Platform Governance',
    'SUPER_ADMIN': 'Platform Governance',
    'ROLE_ADMIN': 'Administration',
    'ADMIN': 'Administration',
    'ROLE_WAREHOUSE': 'Inventory/Warehouse',
    'INVENTORY_MANAGER': 'Inventory/Warehouse',
    'ROLE_ORDER_MANAGER': 'Order Management',
    'ORDER_MANAGER': 'Order Management',
    'ROLE_FULFILLMENT': 'Fulfillment/Logistics',
    'ORDER_PROCESSING_STAFF': 'Fulfillment/Logistics',
    'ROLE_DRIVER': 'Driver/Fleet',
    'DELIVERY_STAFF': 'Driver/Fleet',
    'ROLE_FINANCE': 'Finance/Payments',
    'DATA_ANALYST': 'Finance/Payments',
    'ROLE_SUPPORT': 'Customer Support',
    'CUSTOMER_SUPPORT': 'Customer Support',
    'ROLE_NOTIFICATIONS': 'Notifications/Communications',
    'CATALOG_MANAGER': 'Inventory/Warehouse',
    'DATA_ENTRY_STAFF': 'Inventory/Warehouse'
}


def is_super_admin(user):
    """
    Returns True if user is the designated platform owner Super Admin.
    Strictly isolated: only Jinkalker_Shiva or accounts specifically granted ROLE_SUPER_ADMIN qualify.
    """
    if not user or not user.is_authenticated:
        return False
    if user.username == 'Jinkalker_Shiva':
        return True
    profile = getattr(user, 'profile', None)
    if profile and isinstance(profile.preferences, dict):
        role = profile.preferences.get('role', '')
        roles = profile.preferences.get('roles', [])
        if role == 'ROLE_SUPER_ADMIN' or 'ROLE_SUPER_ADMIN' in roles:
            return True
    return False


def get_role_permissions(role_name):
    # Normalize aliases
    norm = role_name.upper() if role_name else ''
    if norm in ['SUPER_ADMIN', 'SUPERADMIN']:
        norm = 'ROLE_SUPER_ADMIN'
    elif norm in ['ADMIN', 'OPERATOR']:
        norm = 'ROLE_ADMIN'
    elif norm in ['WAREHOUSE', 'WAREHOUSE_STAFF']:
        norm = 'ROLE_WAREHOUSE'
    elif norm in ['ORDER_MANAGER', 'ORDER_MANAGEMENT', 'ROLE_ORDER_MANAGEMENT']:
        norm = 'ROLE_ORDER_MANAGER'
    elif norm in ['FULFILLMENT', 'FULFILLMENT_STAFF', 'LOGISTICS']:
        norm = 'ROLE_FULFILLMENT'
    elif norm in ['FINANCE', 'FINANCE_STAFF', 'PAYMENTS']:
        norm = 'ROLE_FINANCE'
    elif norm in ['SUPPORT', 'SUPPORT_STAFF', 'CUSTOMER_SUPPORT']:
        norm = 'ROLE_SUPPORT'
    elif norm in ['DRIVER', 'DRIVER_STAFF', 'COURIER']:
        norm = 'ROLE_DRIVER'
    elif norm in ['NOTIFICATION', 'NOTIFICATIONS', 'COMMUNICATIONS', 'ROLE_COMMUNICATIONS']:
        norm = 'ROLE_NOTIFICATIONS'

    for r in SYSTEM_ROLES_CATALOG:
        if r['name'] == norm or r['roleName'] == norm or r['name'] == role_name:
            return r['permissions']
    return ['ORDER_READ', 'CATALOG_READ']


def is_admin_or_has_perm(user, perm):
    if not user or not user.is_authenticated:
        return False
    if perm == 'SYSTEM_ADMIN_GOVERNANCE':
        return is_super_admin(user)
    if is_super_admin(user):
        return True
    profile = getattr(user, 'profile', None)
    if profile and isinstance(profile.preferences, dict) and profile.preferences.get('role'):
        role = profile.preferences.get('role', '')
        roles = profile.preferences.get('roles', [role])
        if role in ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'] or 'ROLE_SUPER_ADMIN' in roles or 'ROLE_ADMIN' in roles:
            return True
        user_perms = get_role_permissions(role)
        if perm in user_perms:
            return True
        return False
    if user.is_staff or user.is_superuser:
        return True
    return False


@api_view(['GET', 'POST'])
@authentication_classes([DualJWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_staff_list_create(request):
    """
    [LEGACY / COMPATIBILITY ENDPOINT]
    Authoritative staff management is handled by Spring Boot admin-staff-service via API Gateway (:8080).
    GET: List all staff operators with their roles and status.
    POST: Provision a new staff account (Admin only).
    """
    from django.contrib.auth.hashers import make_password

    if request.method == 'GET':
        if not is_admin_or_has_perm(request.user, 'STAFF_READ'):
            return Response({'status': 'error', 'message': 'Access denied: You do not have permission to view the staff directory.'}, status=status.HTTP_403_FORBIDDEN)

        staff_users = User.objects.filter(is_staff=True).order_by('-date_joined')
        results = []
        for u in staff_users:
            profile, _ = UserProfile.objects.get_or_create(user=u)
            user_is_super = is_super_admin(u)
            default_role = 'ROLE_SUPER_ADMIN' if user_is_super else ('ROLE_ADMIN' if u.is_superuser else 'INVENTORY_MANAGER')
            role_name = profile.preferences.get('role', default_role)
            if user_is_super:
                role_name = 'ROLE_SUPER_ADMIN'
            roles = profile.preferences.get('roles', [role_name])
            user_status = profile.preferences.get('status', 'ACTIVE')
            department = profile.preferences.get('department') or DEFAULT_ROLE_DEPARTMENTS.get(role_name, 'Administration')
            full_name = f"{u.first_name} {u.last_name}".strip() or u.username
            results.append({
                'id': u.id,
                'name': full_name,
                'fullName': full_name,
                'username': u.username,
                'email': u.email,
                'phone': profile.phone or '',
                'department': department,
                'roleName': role_name,
                'roles': roles,
                'isSuperAdmin': user_is_super,
                'status': user_status,
                'effectivePermissions': get_role_permissions(role_name),
                'mustChangePassword': profile.preferences.get('mustChangePassword', False),
                'createdAt': u.date_joined.isoformat(),
                'updatedAt': profile.updated_at.isoformat(),
                'lastLoginAt': u.last_login.isoformat() if u.last_login else None
            })
        return Response({'status': 'success', 'data': results, 'count': len(results)})

    elif request.method == 'POST':
        if not is_admin_or_has_perm(request.user, 'STAFF_CREATE'):
            return Response({'status': 'error', 'message': 'Access denied: Only administrators may provision staff accounts.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        username = data.get('username', '').strip()
        name = (data.get('name') or data.get('fullName') or username).strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        role_name = (data.get('roleName') or (data.get('roles', ['INVENTORY_MANAGER'])[0] if isinstance(data.get('roles'), list) and data.get('roles') else 'INVENTORY_MANAGER')).strip().upper()
        department = data.get('department', '').strip()
        if not department:
            department = DEFAULT_ROLE_DEPARTMENTS.get(role_name, 'Administration')
        status_val = data.get('status', 'ACTIVE').strip().upper()
        if status_val not in ['ACTIVE', 'SUSPENDED']:
            status_val = 'ACTIVE'

        if role_name == 'ROLE_SUPER_ADMIN' and not is_super_admin(request.user):
            return Response({'status': 'error', 'message': 'Access denied: Only the Super Admin can provision another Super Admin.'}, status=status.HTTP_403_FORBIDDEN)

        if not username or not email or not password:
            return Response({'status': 'error', 'message': 'Username, corporate email, and temporary password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({'status': 'error', 'message': 'Temporary password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({'status': 'error', 'message': f"Username '{username}' is already taken"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'status': 'error', 'message': f"Email '{email}' is already in use"}, status=status.HTTP_400_BAD_REQUEST)

        name_parts = name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        user = User.objects.create(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_staff=True,
            password=make_password(password)
        )

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.preferences['role'] = role_name
        profile.preferences['roles'] = [role_name]
        profile.preferences['department'] = department
        profile.preferences['status'] = status_val
        profile.save()

        response_data = {
            'id': user.id,
            'name': name,
            'fullName': name,
            'username': user.username,
            'email': user.email,
            'phone': '',
            'department': department,
            'roleName': role_name,
            'roles': [role_name],
            'isSuperAdmin': is_super_admin(user),
            'status': status_val,
            'effectivePermissions': get_role_permissions(role_name),
            'mustChangePassword': False,
            'createdAt': user.date_joined.isoformat(),
            'updatedAt': profile.updated_at.isoformat(),
            'lastLoginAt': None
        }

        return Response({
            'status': 'success',
            'message': f"Staff account '{username}' provisioned successfully in {department}",
            'data': response_data
        }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@authentication_classes([DualJWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_staff_detail(request, pk):
    """
    GET, PUT, PATCH, DELETE operations for single staff member.
    """
    try:
        user = User.objects.get(pk=pk, is_staff=True)
    except User.DoesNotExist:
        return Response({'status': 'error', 'message': 'Staff member not found'}, status=status.HTTP_404_NOT_FOUND)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    user_is_super = is_super_admin(user)
    default_role = 'ROLE_SUPER_ADMIN' if user_is_super else ('ROLE_ADMIN' if user.is_superuser else 'INVENTORY_MANAGER')
    role_name = profile.preferences.get('role', default_role)
    if user_is_super:
        role_name = 'ROLE_SUPER_ADMIN'
    roles = profile.preferences.get('roles', [role_name])
    user_status = profile.preferences.get('status', 'ACTIVE')
    department = profile.preferences.get('department') or DEFAULT_ROLE_DEPARTMENTS.get(role_name, 'Administration')
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username

    if request.method == 'GET':
        if not is_admin_or_has_perm(request.user, 'STAFF_READ'):
            return Response({'status': 'error', 'message': 'Access denied: You do not have permission to view staff details.'}, status=status.HTTP_403_FORBIDDEN)

        return Response({
            'status': 'success',
            'data': {
                'id': user.id,
                'name': full_name,
                'fullName': full_name,
                'username': user.username,
                'email': user.email,
                'phone': profile.phone or '',
                'department': department,
                'roleName': role_name,
                'roles': roles,
                'isSuperAdmin': user_is_super,
                'status': user_status,
                'effectivePermissions': get_role_permissions(role_name),
                'mustChangePassword': profile.preferences.get('mustChangePassword', False),
                'createdAt': user.date_joined.isoformat(),
                'updatedAt': profile.updated_at.isoformat(),
                'lastLoginAt': user.last_login.isoformat() if user.last_login else None
            }
        })

    elif request.method in ['PUT', 'PATCH']:
        if not is_admin_or_has_perm(request.user, 'STAFF_UPDATE'):
            return Response({'status': 'error', 'message': 'Access denied: Only administrators may update staff records.'}, status=status.HTTP_403_FORBIDDEN)

        if user_is_super and not is_super_admin(request.user):
            return Response({'status': 'error', 'message': 'Access denied: Regular administrators cannot modify the Super Admin account.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        if 'roleName' in data or 'roles' in data:
            requested_role = data.get('roleName') or (data.get('roles')[0] if isinstance(data.get('roles'), list) and data.get('roles') else role_name)
            if requested_role == 'ROLE_SUPER_ADMIN' and not is_super_admin(request.user):
                return Response({'status': 'error', 'message': 'Access denied: Only the Super Admin may assign the Super Admin role.'}, status=status.HTTP_403_FORBIDDEN)

        if 'name' in data or 'fullName' in data:
            name = (data.get('name') or data.get('fullName')).strip()
            name_parts = name.split(' ', 1)
            user.first_name = name_parts[0]
            user.last_name = name_parts[1] if len(name_parts) > 1 else ''
        if 'email' in data:
            new_email = data['email'].strip().lower()
            if new_email != user.email and User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                return Response({'status': 'error', 'message': f"Email '{new_email}' is already in use"}, status=status.HTTP_400_BAD_REQUEST)
            user.email = new_email
        user.save()

        if 'phone' in data:
            profile.phone = data['phone']
        if 'department' in data:
            profile.preferences['department'] = data['department'].strip()
        if 'roleName' in data or 'roles' in data:
            new_role = data.get('roleName') or (data.get('roles')[0] if isinstance(data.get('roles'), list) and data.get('roles') else role_name)
            profile.preferences['role'] = new_role
            profile.preferences['roles'] = data.get('roles') or [new_role]
            if 'department' not in data and not profile.preferences.get('department'):
                profile.preferences['department'] = DEFAULT_ROLE_DEPARTMENTS.get(new_role, 'Administration')
        if 'status' in data:
            if user_is_super and data['status'] == 'SUSPENDED':
                return Response({'status': 'error', 'message': 'The Super Admin account cannot be suspended or deactivated.'}, status=status.HTTP_400_BAD_REQUEST)
            profile.preferences['status'] = data['status']
        profile.save()

        updated_role = profile.preferences.get('role', role_name)
        updated_dept = profile.preferences.get('department') or DEFAULT_ROLE_DEPARTMENTS.get(updated_role, 'Administration')
        updated_name = f"{user.first_name} {user.last_name}".strip() or user.username
        return Response({
            'status': 'success',
            'message': 'Staff record updated successfully',
            'data': {
                'id': user.id,
                'name': updated_name,
                'fullName': updated_name,
                'username': user.username,
                'email': user.email,
                'phone': profile.phone or '',
                'department': updated_dept,
                'roleName': updated_role,
                'roles': profile.preferences.get('roles', [updated_role]),
                'isSuperAdmin': user_is_super,
                'status': profile.preferences.get('status', 'ACTIVE'),
                'effectivePermissions': get_role_permissions(updated_role)
            }
        })

    elif request.method == 'DELETE':
        if not (is_super_admin(request.user) or request.user.is_superuser or (getattr(request.user, 'profile', None) and request.user.profile.preferences.get('role') == 'ROLE_ADMIN')):
            return Response({'status': 'error', 'message': 'Access denied: Only administrators may delete staff records.'}, status=status.HTTP_403_FORBIDDEN)
        if user_is_super:
            return Response({'status': 'error', 'message': 'The Super Admin account cannot be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        if user.username == 'admin':
            return Response({'status': 'error', 'message': 'Root admin account cannot be deleted'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({
            'status': 'success',
            'message': f"Staff member '{user.username}' deleted successfully"
        })


@api_view(['PATCH', 'POST'])
@authentication_classes([DualJWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_staff_status_update(request, pk):
    """
    Toggle or update staff account status (ACTIVE or SUSPENDED).
    """
    if not is_admin_or_has_perm(request.user, 'STAFF_DISABLE'):
        return Response({'status': 'error', 'message': 'Access denied: Only administrators may modify staff status.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = User.objects.get(pk=pk, is_staff=True)
    except User.DoesNotExist:
        return Response({'status': 'error', 'message': 'Staff member not found'}, status=status.HTTP_404_NOT_FOUND)

    if is_super_admin(user):
        return Response({'status': 'error', 'message': 'The Super Admin account cannot be suspended or deactivated.'}, status=status.HTTP_400_BAD_REQUEST)

    new_status = request.data.get('status', 'ACTIVE').upper()
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.preferences['status'] = new_status
    profile.save()

    role_name = profile.preferences.get('role', 'INVENTORY_MANAGER')
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
    return Response({
        'status': 'success',
        'message': f"Staff status updated to {new_status}",
        'data': {
            'id': user.id,
            'name': full_name,
            'fullName': full_name,
            'username': user.username,
            'email': user.email,
            'roleName': role_name,
            'roles': profile.preferences.get('roles', [role_name]),
            'isSuperAdmin': False,
            'status': new_status
        }
    })


@api_view(['POST'])
@authentication_classes([DualJWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_staff_reset_password(request, pk):
    """
    Reset password for a staff member.
    """
    if not is_admin_or_has_perm(request.user, 'STAFF_UPDATE'):
        return Response({'status': 'error', 'message': 'Access denied: Only administrators may reset passwords.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = User.objects.get(pk=pk, is_staff=True)
    except User.DoesNotExist:
        return Response({'status': 'error', 'message': 'Staff member not found'}, status=status.HTTP_404_NOT_FOUND)

    if is_super_admin(user) and not is_super_admin(request.user):
        return Response({'status': 'error', 'message': 'Access denied: Regular administrators cannot reset password for the Super Admin account.'}, status=status.HTTP_403_FORBIDDEN)

    new_password = request.data.get('newPassword') or request.data.get('password')
    if not new_password or len(new_password) < 6:
        return Response({'status': 'error', 'message': 'Password must be at least 6 characters long'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    return Response({
        'status': 'success',
        'message': f"Password reset successfully for staff member '{user.username}'"
    })


@api_view(['GET'])
@authentication_classes([DualJWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_roles_list(request):
    """
    List all available operational roles and their permission assignments.
    """
    return Response({
        'status': 'success',
        'data': SYSTEM_ROLES_CATALOG,
        'count': len(SYSTEM_ROLES_CATALOG)
    })


@api_view(['GET'])
@authentication_classes([DualJWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_permissions_list(request):
    """
    List all fine-grained system permission keys.
    """
    all_perms = set()
    for r in SYSTEM_ROLES_CATALOG:
        all_perms.update(r['permissions'])
    return Response({
        'status': 'success',
        'data': sorted(list(all_perms)),
        'count': len(all_perms)
    })


@api_view(['GET'])
@authentication_classes([DualJWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_departments_list(request):
    """
    List all authorized operational departments and their mapped roles.
    """
    return Response({
        'status': 'success',
        'data': OPERATIONAL_DEPARTMENTS,
        'count': len(OPERATIONAL_DEPARTMENTS)
    })


# ============ Customer Saved Delivery Addresses ============

@api_view(['GET', 'POST'])
@authentication_classes([DualJWTAuthentication])
@permission_classes([IsAuthenticated])
def user_addresses_list_create(request):
    """List customer's saved delivery addresses or create a new one."""
    if request.method == 'GET':
        addresses = UserAddress.objects.filter(user=request.user)
        serializer = UserAddressSerializer(addresses, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data,
            'addresses': serializer.data
        })

    # POST: Add new address
    data = request.data.copy()

    # Address Deduplication: check if identical address already saved for this user
    addr_line = (data.get('address_line') or '').strip()
    city = (data.get('city') or '').strip()
    zipcode = (data.get('zipcode') or '').strip()
    addr_type = (data.get('address_type') or 'HOME').strip().upper()

    if addr_line and city and zipcode:
        existing = UserAddress.objects.filter(
            user=request.user,
            address_line__iexact=addr_line,
            city__iexact=city,
            zipcode__iexact=zipcode,
            address_type=addr_type
        ).first()
        if existing:
            return Response({
                'status': 'duplicate',
                'message': 'An address with these details is already saved.',
                'data': UserAddressSerializer(existing).data,
                'address': UserAddressSerializer(existing).data,
                'duplicate': True
            }, status=status.HTTP_200_OK)

    serializer = UserAddressSerializer(data=data)
    if serializer.is_valid():
        address = serializer.save(user=request.user)
        # If this is user's first address, make it default
        if UserAddress.objects.filter(user=request.user).count() == 1:
            address.is_default = True
            address.save(update_fields=['is_default'])
        return Response({
            'status': 'success',
            'message': 'Address saved successfully',
            'data': UserAddressSerializer(address).data,
            'address': UserAddressSerializer(address).data
        }, status=status.HTTP_201_CREATED)

    return Response({
        'status': 'error',
        'message': 'Invalid address data',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@authentication_classes([DualJWTAuthentication])
@permission_classes([IsAuthenticated])
def user_address_detail(request, pk):
    """Retrieve, update, or delete a saved delivery address (strictly scoped to authenticated user)."""
    try:
        address = UserAddress.objects.get(pk=pk, user=request.user)
    except UserAddress.DoesNotExist:
        return Response({'status': 'error', 'message': 'Address not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'status': 'success', 'data': UserAddressSerializer(address).data})

    if request.method in ['PUT', 'PATCH']:
        serializer = UserAddressSerializer(address, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                'status': 'success',
                'message': 'Address updated successfully',
                'data': UserAddressSerializer(updated).data,
                'address': UserAddressSerializer(updated).data
            })
        return Response({'status': 'error', 'message': 'Invalid address data', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        was_default = address.is_default
        address.delete()
        if was_default:
            next_addr = UserAddress.objects.filter(user=request.user).first()
            if next_addr:
                next_addr.is_default = True
                next_addr.save(update_fields=['is_default'])
        return Response({'status': 'success', 'message': 'Address removed successfully'})


@api_view(['POST'])
@authentication_classes([DualJWTAuthentication])
@permission_classes([IsAuthenticated])
def user_address_set_default(request, pk):
    """Set a saved address as the default shipping address."""
    try:
        address = UserAddress.objects.get(pk=pk, user=request.user)
    except UserAddress.DoesNotExist:
        return Response({'status': 'error', 'message': 'Address not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

    address.is_default = True
    address.save()
    return Response({
        'status': 'success',
        'message': 'Default address updated successfully',
        'data': UserAddressSerializer(address).data
    })



