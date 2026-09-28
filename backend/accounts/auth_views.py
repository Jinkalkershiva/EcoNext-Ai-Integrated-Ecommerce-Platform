from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.views.decorators.http import require_http_methods
from .serializers import SignUpSerializer, LoginSerializer, UserSerializer, UserProfileSerializer
from .models import UserProfile

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
    assigned_role = profile.preferences.get('role', 'ROLE_ADMIN' if user.is_superuser else 'INVENTORY_MANAGER')
    assigned_roles = profile.preferences.get('roles', [assigned_role])
    user_status = profile.preferences.get('status', 'ACTIVE')
    if user_status == 'SUSPENDED':
        return Response({'status': 'error', 'message': 'Account is suspended'}, status=status.HTTP_401_UNAUTHORIZED)

    if user.is_superuser or assigned_role == 'ROLE_ADMIN':
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
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def admin_me_view(request):
    """
    Returns the authenticated staff member's profile and RBAC permissions.
    """
    user = request.user
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
    profile, _ = UserProfile.objects.get_or_create(user=user)
    assigned_role = profile.preferences.get('role', 'ROLE_ADMIN' if user.is_superuser else 'INVENTORY_MANAGER')
    assigned_roles = profile.preferences.get('roles', [assigned_role])

    if user.is_superuser or assigned_role == 'ROLE_ADMIN':
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
    """
    refresh_token = request.data.get('refreshToken') or request.data.get('refresh')
    if not refresh_token:
        return Response({
            'status': 'error',
            'message': 'Refresh token is required'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        token = RefreshToken(refresh_token)
        return Response({
            'status': 'success',
            'data': {
                'accessToken': str(token.access_token)
            }
        }, status=status.HTTP_200_OK)
    except Exception:
        return Response({
            'status': 'error',
            'message': 'Invalid or expired refresh token'
        }, status=status.HTTP_401_UNAUTHORIZED)


SYSTEM_ROLES_CATALOG = [
    {
        'id': '1',
        'name': 'ROLE_ADMIN',
        'roleName': 'ROLE_ADMIN',
        'description': 'Full System Administrator with unrestricted access',
        'isSystemRole': True,
        'permissions': [
            'CATALOG_CREATE', 'CATALOG_READ', 'CATALOG_UPDATE', 'CATALOG_DELETE',
            'INVENTORY_CREATE', 'INVENTORY_READ', 'INVENTORY_UPDATE', 'INVENTORY_ADJUST',
            'ORDER_READ', 'ORDER_UPDATE', 'ORDER_PROCESS', 'ORDER_STATUS_UPDATE',
            'DATA_IMPORT', 'DATA_EXPORT', 'DATA_ANALYSIS',
            'STAFF_CREATE', 'STAFF_READ', 'STAFF_UPDATE', 'STAFF_DISABLE',
            'AUDIT_READ'
        ]
    },
    {
        'id': '2',
        'name': 'INVENTORY_MANAGER',
        'roleName': 'INVENTORY_MANAGER',
        'description': 'Manages stock inventory, adjustments, thresholds, and low-stock alerts',
        'isSystemRole': True,
        'permissions': [
            'INVENTORY_CREATE', 'INVENTORY_READ', 'INVENTORY_UPDATE', 'INVENTORY_ADJUST',
            'CATALOG_READ', 'DATA_IMPORT', 'DATA_EXPORT'
        ]
    },
    {
        'id': '3',
        'name': 'CATALOG_MANAGER',
        'roleName': 'CATALOG_MANAGER',
        'description': 'Manages products, categories, pricing, attributes, and catalog data entry',
        'isSystemRole': True,
        'permissions': [
            'CATALOG_CREATE', 'CATALOG_READ', 'CATALOG_UPDATE', 'CATALOG_DELETE',
            'INVENTORY_READ', 'DATA_IMPORT', 'DATA_EXPORT'
        ]
    },
    {
        'id': '4',
        'name': 'ORDER_MANAGER',
        'roleName': 'ORDER_MANAGER',
        'description': 'Supervises order processing, lifecycle states, cancellations, and logistics',
        'isSystemRole': True,
        'permissions': [
            'ORDER_READ', 'ORDER_UPDATE', 'ORDER_PROCESS', 'ORDER_STATUS_UPDATE',
            'CATALOG_READ', 'INVENTORY_READ'
        ]
    },
    {
        'id': '5',
        'name': 'ORDER_PROCESSING_STAFF',
        'roleName': 'ORDER_PROCESSING_STAFF',
        'description': 'Handles daily picking, packing, and shipment dispatch transitions',
        'isSystemRole': True,
        'permissions': [
            'ORDER_READ', 'ORDER_PROCESS', 'ORDER_STATUS_UPDATE', 'CATALOG_READ'
        ]
    },
    {
        'id': '6',
        'name': 'DATA_ANALYST',
        'roleName': 'DATA_ANALYST',
        'description': 'Accesses reports, operational analytics, sales aggregations, and data exports',
        'isSystemRole': True,
        'permissions': [
            'DATA_ANALYSIS', 'DATA_EXPORT', 'CATALOG_READ', 'INVENTORY_READ', 'ORDER_READ', 'AUDIT_READ'
        ]
    },
    {
        'id': '7',
        'name': 'DATA_ENTRY_STAFF',
        'roleName': 'DATA_ENTRY_STAFF',
        'description': 'Performs manual product creation and batch CSV/Excel data entry',
        'isSystemRole': True,
        'permissions': [
            'CATALOG_CREATE', 'CATALOG_READ', 'CATALOG_UPDATE', 'DATA_IMPORT'
        ]
    },
    {
        'id': '8',
        'name': 'DELIVERY_STAFF',
        'roleName': 'DELIVERY_STAFF',
        'description': 'Field and dispatch logistics updates (Out for delivery, Delivered)',
        'isSystemRole': True,
        'permissions': [
            'ORDER_READ', 'ORDER_STATUS_UPDATE'
        ]
    }
]


def get_role_permissions(role_name):
    for r in SYSTEM_ROLES_CATALOG:
        if r['name'] == role_name or r['roleName'] == role_name:
            return r['permissions']
    return ['ORDER_READ', 'CATALOG_READ']


def is_admin_or_has_perm(user, perm):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    profile = getattr(user, 'profile', None)
    if profile and isinstance(profile.preferences, dict):
        role = profile.preferences.get('role', '')
        if role == 'ROLE_ADMIN':
            return True
        roles = profile.preferences.get('roles', [role])
        if 'ROLE_ADMIN' in roles:
            return True
        user_perms = get_role_permissions(role)
        if perm in user_perms:
            return True
    return False


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
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
        staff_users = User.objects.filter(is_staff=True).order_by('-date_joined')
        results = []
        for u in staff_users:
            profile, _ = UserProfile.objects.get_or_create(user=u)
            role_name = profile.preferences.get('role', 'ROLE_ADMIN' if u.is_superuser else 'INVENTORY_MANAGER')
            roles = profile.preferences.get('roles', [role_name])
            user_status = profile.preferences.get('status', 'ACTIVE')
            full_name = f"{u.first_name} {u.last_name}".strip() or u.username
            results.append({
                'id': u.id,
                'name': full_name,
                'fullName': full_name,
                'username': u.username,
                'email': u.email,
                'phone': profile.phone or '',
                'roleName': role_name,
                'roles': roles,
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

        if not username or not email or not password:
            return Response({'status': 'error', 'message': 'Username, corporate email, and temporary password are required.'}, status=status.HTTP_400_BAD_REQUEST)

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
        profile.preferences['status'] = 'ACTIVE'
        profile.save()

        response_data = {
            'id': user.id,
            'name': name,
            'fullName': name,
            'username': user.username,
            'email': user.email,
            'phone': '',
            'roleName': role_name,
            'roles': [role_name],
            'status': 'ACTIVE',
            'effectivePermissions': get_role_permissions(role_name),
            'mustChangePassword': False,
            'createdAt': user.date_joined.isoformat(),
            'updatedAt': profile.updated_at.isoformat(),
            'lastLoginAt': None
        }

        return Response({
            'status': 'success',
            'message': f"Staff account '{username}' provisioned successfully",
            'data': response_data
        }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@authentication_classes([JWTAuthentication])
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
    role_name = profile.preferences.get('role', 'ROLE_ADMIN' if user.is_superuser else 'INVENTORY_MANAGER')
    roles = profile.preferences.get('roles', [role_name])
    user_status = profile.preferences.get('status', 'ACTIVE')
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username

    if request.method == 'GET':
        return Response({
            'status': 'success',
            'data': {
                'id': user.id,
                'name': full_name,
                'fullName': full_name,
                'username': user.username,
                'email': user.email,
                'phone': profile.phone or '',
                'roleName': role_name,
                'roles': roles,
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

        data = request.data
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
        if 'roleName' in data or 'roles' in data:
            new_role = data.get('roleName') or (data.get('roles')[0] if isinstance(data.get('roles'), list) and data.get('roles') else role_name)
            profile.preferences['role'] = new_role
            profile.preferences['roles'] = data.get('roles') or [new_role]
        if 'status' in data:
            profile.preferences['status'] = data['status']
        profile.save()

        updated_role = profile.preferences.get('role', role_name)
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
                'roleName': updated_role,
                'roles': profile.preferences.get('roles', [updated_role]),
                'status': profile.preferences.get('status', 'ACTIVE'),
                'effectivePermissions': get_role_permissions(updated_role)
            }
        })

    elif request.method == 'DELETE':
        if not (request.user.is_superuser or (getattr(request.user, 'profile', None) and request.user.profile.preferences.get('role') == 'ROLE_ADMIN')):
            return Response({'status': 'error', 'message': 'Access denied: Only root administrators may delete staff records.'}, status=status.HTTP_403_FORBIDDEN)
        if user.username == 'admin':
            return Response({'status': 'error', 'message': 'Root admin account cannot be deleted'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({'status': 'success', 'message': f"Staff member '{user.username}' deleted successfully"})


@api_view(['PATCH', 'POST'])
@authentication_classes([JWTAuthentication])
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
            'status': new_status
        }
    })


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
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
@authentication_classes([JWTAuthentication])
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
@authentication_classes([JWTAuthentication])
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


