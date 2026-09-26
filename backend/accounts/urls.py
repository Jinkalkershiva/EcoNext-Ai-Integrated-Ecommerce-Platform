from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from . import auth_views

urlpatterns = [
    path('auth/signup/', auth_views.signup_view, name='signup'),
    path('auth/login/', auth_views.login_view, name='login'),
    path('auth/logout/', auth_views.logout_view, name='logout'),
    path('auth/current-user/', auth_views.current_user_view, name='current-user'),
    path('auth/profile/update/', auth_views.update_profile_view, name='update-profile'),

    # Access tokens live 24h and refresh tokens 7 days, but there was no way to
    # exchange one for the other — every session silently died after a day.
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/verify/', TokenVerifyView.as_view(), name='token-verify'),
]
