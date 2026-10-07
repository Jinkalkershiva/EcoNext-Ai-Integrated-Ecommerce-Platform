from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from . import auth_views

urlpatterns = [
    path('auth/signup/', auth_views.signup_view, name='signup'),
    path('auth/login/', auth_views.login_view, name='login'),
    path('auth/logout/', auth_views.logout_view, name='logout'),
    path('auth/current-user/', auth_views.current_user_view, name='current-user'),
    path('auth/profile/update/', auth_views.update_profile_view, name='update-profile'),

    # Redis OTP Authentication & Password Reset
    path('auth/otp/send/', auth_views.send_otp_view, name='send-otp'),
    path('auth/otp/verify/', auth_views.verify_otp_view, name='verify-otp'),
    path('auth/otp/reset-password/', auth_views.reset_password_with_otp_view, name='reset-password-otp'),

    # Customer Saved Delivery Addresses
    path('auth/addresses/', auth_views.user_addresses_list_create, name='user-addresses'),
    path('auth/addresses', auth_views.user_addresses_list_create, name='user-addresses-noslash'),
    path('auth/addresses/<int:pk>/', auth_views.user_address_detail, name='user-address-detail'),
    path('auth/addresses/<int:pk>', auth_views.user_address_detail, name='user-address-detail-noslash'),
    path('auth/addresses/<int:pk>/set-default/', auth_views.user_address_set_default, name='user-address-set-default'),
    path('auth/addresses/<int:pk>/set-default', auth_views.user_address_set_default, name='user-address-set-default-noslash'),

    # Access tokens live 24h and refresh tokens 7 days, but there was no way to
    # exchange one for the other — every session silently died after a day.
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/verify/', TokenVerifyView.as_view(), name='token-verify'),
]
