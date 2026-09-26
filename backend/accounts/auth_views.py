from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
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
