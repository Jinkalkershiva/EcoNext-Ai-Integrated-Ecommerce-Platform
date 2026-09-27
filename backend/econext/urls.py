"""
URL configuration for econext project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from products.views import welcome
from shop_cart import api_views as cart_views
from personalization.views import UserPreferenceViewSet
from kids_products.views import KidsProductViewSet
from copilot.views import ChatAPIView
from products import admin_views
from accounts import auth_views
from shop_cart import payment_views

urlpatterns = [
    path('', welcome, name='welcome'),
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/', include('accounts.urls')),
    path('api/products/', include('products.urls')),
    path('api/copilot/', include('copilot.urls')),
    path('api/chat/', ChatAPIView.as_view(), name='chat-endpoint'),
    path(
        'api/personalization/preferences/',
        UserPreferenceViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='userpreference-list'
    ),
    path(
        'api/personalization/preferences/<int:pk>/',
        UserPreferenceViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy'}),
        name='userpreference-detail'
    ),
    path(
        'api/kids/products/',
        KidsProductViewSet.as_view({'get': 'list'}),
        name='kidsproduct-list'
    ),
    path(
        'api/kids/products/<int:pk>/',
        KidsProductViewSet.as_view({'get': 'retrieve'}),
        name='kidsproduct-detail'
    ),
    
    # Cart endpoints
    path('api/cart/', cart_views.get_cart, name='get_cart'),
    path('api/cart/add/', cart_views.add_to_cart, name='add_to_cart'),
    path('api/cart/item/<int:item_id>/', cart_views.update_cart_item, name='update_cart_item'),
    path('api/cart/item/<int:item_id>/delete/', cart_views.remove_from_cart, name='remove_from_cart'),
    path('api/cart/clear/', cart_views.clear_cart, name='clear_cart'),
    
    # Order endpoints
    path('api/orders/create/', cart_views.create_order, name='create_order'),
    path('api/orders/', cart_views.order_list, name='order_list'),
    path('api/orders/<int:order_id>/', cart_views.order_detail, name='order_detail'),
    path('api/orders/<int:order_id>/status/', cart_views.update_order_status, name='update_order_status'),
    # Payment & Razorpay endpoints
    path('api/payments/create-order/', payment_views.create_razorpay_order_view, name='create_razorpay_order'),
    path('api/payments/create-order', payment_views.create_razorpay_order_view, name='create_razorpay_order_noslash'),
    path('api/payments/verify/', payment_views.verify_razorpay_payment_view, name='verify_razorpay_payment'),
    path('api/payments/verify', payment_views.verify_razorpay_payment_view, name='verify_razorpay_payment_noslash'),
    path('api/payments/razorpay/webhook/', payment_views.razorpay_webhook_view, name='razorpay_webhook'),
    path('api/payments/razorpay/webhook', payment_views.razorpay_webhook_view, name='razorpay_webhook_noslash'),

    # Admin Panel REST APIs (RBAC Protected) - Dual route support for trailing and non-trailing slashes
    path('api/admin/auth/login/', auth_views.admin_login_view, name='admin_login'),
    path('api/admin/auth/login', auth_views.admin_login_view, name='admin_login_noslash'),
    path('api/admin/auth/me/', auth_views.admin_me_view, name='admin_me'),
    path('api/admin/auth/me', auth_views.admin_me_view, name='admin_me_noslash'),
    path('api/admin/auth/refresh/', auth_views.admin_refresh_view, name='admin_refresh'),
    path('api/admin/auth/refresh', auth_views.admin_refresh_view, name='admin_refresh_noslash'),
    path('api/admin/dashboard/', admin_views.admin_dashboard_stats, name='admin_dashboard_stats'),
    path('api/admin/dashboard', admin_views.admin_dashboard_stats, name='admin_dashboard_stats_noslash'),
    path('api/admin/products/', admin_views.admin_products_list_create, name='admin_products_list_create'),
    path('api/admin/products', admin_views.admin_products_list_create, name='admin_products_list_create_noslash'),
    path('api/admin/products/<int:pk>/', admin_views.admin_product_detail, name='admin_product_detail'),
    path('api/admin/products/<int:pk>', admin_views.admin_product_detail, name='admin_product_detail_noslash'),
    path('api/admin/orders/', admin_views.admin_orders_list, name='admin_orders_list'),
    path('api/admin/orders', admin_views.admin_orders_list, name='admin_orders_list_noslash'),
    path('api/admin/orders/<int:pk>/', admin_views.admin_order_detail, name='admin_order_detail'),
    path('api/admin/orders/<int:pk>', admin_views.admin_order_detail, name='admin_order_detail_noslash'),
    path('api/admin/orders/<int:order_id>/status/', admin_views.admin_order_status_update, name='admin_order_status_update'),
    path('api/admin/orders/<int:order_id>/status', admin_views.admin_order_status_update, name='admin_order_status_update_noslash'),
    path('api/admin/payments/', admin_views.admin_payments_list, name='admin_payments_list'),
    path('api/admin/payments', admin_views.admin_payments_list, name='admin_payments_list_noslash'),
    path('api/admin/notifications/', admin_views.admin_notifications_list, name='admin_notifications_list'),
    path('api/admin/notifications', admin_views.admin_notifications_list, name='admin_notifications_list_noslash'),
    path('api/admin/customers/', admin_views.admin_users_list, name='admin_customers_list'),
    path('api/admin/customers', admin_views.admin_users_list, name='admin_customers_list_noslash'),
    path('api/admin/users/', admin_views.admin_users_list, name='admin_users_list'),
    path('api/admin/users', admin_views.admin_users_list, name='admin_users_list_noslash'),
    path('api/admin/categories/', admin_views.admin_categories_list_create, name='admin_categories_list_create'),
    path('api/admin/categories', admin_views.admin_categories_list_create, name='admin_categories_list_create_noslash'),
]

# Serve uploaded media (visual-search images) from the dev server. In production
# these are served by the web server or object storage, not Django.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
