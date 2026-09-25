# EcoNext Backend - Complete Implementation Guide

## ✅ Backend Architecture Overview

### API Endpoints (All Fully Implemented)

#### Authentication Endpoints
- `POST /api/auth/signup/` - User registration with JWT tokens
- `POST /api/auth/login/` - User login with JWT tokens
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/current-user/` - Get authenticated user profile
- `PUT /api/auth/profile/update/` - Update user profile information

#### Product Endpoints
- `GET /api/products/?page=1&per_page=12` - Get products with pagination
- `GET /api/products/{id}/` - Get single product with price prediction
- `GET /api/products/trending/` - Get trending products (top 10)
- `GET /api/products/categories/` - Browse products by category
- `GET /api/products/{id}/prediction/` - Get 7-day price prediction for product

#### Search Endpoints
- `GET /api/products/search/intent/?q=query` - Intent-based semantic search
- `POST /api/products/search/visual/` - Visual search using image upload
- `GET /api/products/search/trending/` - Get trending search queries

#### Shopping Cart Endpoints (Authentication Required)
- `GET /api/cart/` - Get user's shopping cart
- `POST /api/cart/add/` - Add product to cart
- `PATCH /api/cart/item/{id}/` - Update cart item quantity
- `DELETE /api/cart/item/{id}/delete/` - Remove item from cart
- `DELETE /api/cart/clear/` - Clear entire cart

#### Order Endpoints (Authentication Required)
- `POST /api/orders/create/` - Create order from cart
- `GET /api/orders/` - Get user's orders
- `GET /api/orders/{id}/` - Get order details
- `PATCH /api/orders/{id}/status/` - Update order status (admin only)

---

## 🔧 Backend Setup Components

### 1. Database Models (All Complete)

#### Products App
- `Product` - Main product model with pricing, categories, tags
- `Category` - Product categories (Electronics, Fitness, Kitchen, Fashion, Home & Garden)
- `PriceHistory` - Historical price tracking for predictions
- `ProductView` - User view tracking for analytics
- `ProductSearch` - Search query logging

#### Accounts App
- `User` - Django built-in user model
- `UserProfile` - Extended user info (phone, address, preferences)
- `ActivityLog` - User activity tracking (views, searches, purchases)

#### Shop Cart App
- `Cart` - Shopping cart (one-to-one with User)
- `CartItem` - Individual items in cart

#### Order Service App
- `Order` - Order with status tracking (pending, confirmed, shipped, delivered, cancelled)
- `OrderItem` - Individual items in order

#### Site Analytics App
- `DailyStats` - Daily statistics
- `TrendingProduct` - Trending products ranking

#### ML Engine App
- `PricePrediction` - 7-day price predictions with confidence scores

### 2. Serializers (All Complete)

- `ProductSerializer` - Product data with category
- `CartSerializer` - Cart with items and total
- `CartItemSerializer` - Individual cart items
- `OrderSerializer` - Order with items
- `PricePredictionSerializer` - Price prediction data
- `UserProfileSerializer` - User profile information
- `ActivityLogSerializer` - Activity logs with product info
- `SearchResultSerializer` - Search results with similarity scores

### 3. Authentication & Security

- **JWT Tokens**: Access token (24 hours) + Refresh token (7 days)
- **CORS**: Enabled for frontend (http://localhost:3000)
- **Permissions**: 
  - Public: Product browsing, search, trends
  - Authenticated: Cart management, orders, profile
  - Admin: Order status updates

### 4. API Response Format

All endpoints return consistent JSON:
```json
{
  "status": "success|error",
  "message": "optional message",
  "data": {}
}
```

---

## 📊 Data Population

### Management Commands Created

#### 1. `seed_data` (Already Existed - Enhanced)
- Creates 50 eco-friendly products across 5 categories
- Includes pricing, descriptions, images, stock levels
- Generates 60-day price history for each product
- Creates price predictions using ML model

**Usage**: `python manage.py seed_data`

#### 2. `seed_analytics` (NEW)
- Generates sample ProductView records (user views)
- Creates ProductSearch records (search queries)
- Populates DailyStats with analytics
- Seeds 15+ products with engagement data

**Usage**: `python manage.py seed_analytics`

#### 3. `generate_trending` (NEW)
- Calculates trending products from analytics
- Ranks products by views + searches + purchases
- Updates TrendingProduct model
- Creates top 10 trending list

**Usage**: `python manage.py generate_trending`

### Trending Products Algorithm
1. Score = (views × 2) + (searches × 1) + (purchases × 3)
2. Top 10 products by score become trending
3. Updated daily with fresh analytics

---

## 🎯 Frontend Integration Points

### API Service (Complete)

All frontend API calls routed through `apiService` object with methods:

**Authentication**
- `signup(userData)` - Register new user
- `login(credentials)` - Login with username/password
- `logout()` - Logout user
- `getCurrentUser()` - Get current user profile
- `updateProfile(data)` - Update profile info

**Products**
- `getProducts(page, perPage)` - Get products with pagination
- `getProductDetail(productId)` - Get single product + prediction
- `getTrendingProducts()` - Get trending list
- `getPricePrediction(productId)` - Get price prediction

**Search**
- `intentSearch(query)` - Search by intent
- `visualSearch(imageFile)` - Search by image

**Cart**
- `getCart(authToken)` - Get shopping cart
- `addToCart(productId, quantity, authToken)` - Add to cart
- `updateCartItem(itemId, quantity, authToken)` - Update quantity
- `removeFromCart(itemId, authToken)` - Remove from cart
- `clearCart(authToken)` - Clear entire cart

**Orders**
- `createOrder(shippingData, authToken)` - Create order
- `getOrders(authToken)` - Get user's orders
- `getOrderDetail(orderId, authToken)` - Get order details

---

## 🔄 Key Workflows

### User Registration Flow
1. User fills signup form → `POST /api/auth/signup/`
2. Server creates User + UserProfile
3. Returns JWT access & refresh tokens
4. Frontend stores tokens in localStorage
5. User redirected to homepage

### Product Purchase Flow
1. User browses products → `GET /api/products/`
2. Adds to cart → `POST /api/cart/add/` (authenticated)
3. Views cart → `GET /api/cart/`
4. Proceeds to checkout (new page)
5. Submits shipping info → `POST /api/orders/create/`
6. Server creates Order + OrderItems
7. Cart cleared automatically
8. User gets order confirmation

### Trending Products Flow
1. User views/searches products → Creates ProductView/ProductSearch
2. Admin runs trending generation → `python manage.py generate_trending`
3. TrendingProduct records updated
4. Frontend fetches trending → `GET /api/products/trending/`
5. Displays top 10 products in carousel

---

## 📋 Frontend Components (NEW)

### CheckoutPage.js
- Multi-step checkout form
- Shipping address collection
- Order summary display
- Form validation
- Success confirmation

### ProfilePage.js
- User information display
- Profile editing capability
- Order history view
- Address management

### Updated Components
- App.js: Added checkout and profile routing
- LoginPage: JWT token handling
- SignupPage: User creation workflow
- ProductDetailView: Price prediction display

---

## 🧪 Testing & Deployment

### Pre-Launch Checklist
- [x] Database models created and migrated
- [x] All API endpoints implemented
- [x] JWT authentication configured
- [x] CORS enabled for frontend
- [x] Trending algorithm implemented
- [x] Cart & order workflow complete
- [x] Frontend pages created & routed
- [x] Analytics data seeding complete
- [x] Error handling implemented
- [x] Response formats standardized

### Running Locally

**Backend**:
```bash
cd backend
python manage.py migrate
python manage.py seed_data
python manage.py seed_analytics
python manage.py generate_trending
python manage.py runserver 0.0.0.0:8000
```

**Frontend**:
```bash
cd frontend
npm start
# Opens on http://localhost:3000
```

### Database Reset
```bash
cd backend
rm db.sqlite3
python manage.py migrate
python manage.py seed_data
python manage.py seed_analytics
python manage.py generate_trending
```

---

## 🚀 Production Considerations

1. **Database**: Managed MySQL 8.0 databases per service
2. **Cache**: Enable Redis for caching
3. **Celery**: Implement for async tasks (price predictions, trending updates)
4. **Security**: 
   - Add rate limiting
   - Implement CSRF tokens
   - Add request validation
5. **Monitoring**: Add logging and error tracking
6. **Performance**: Implement database indexing and query optimization

---

## 📝 Configuration Files

### settings.py
- Django 5.1.6
- REST Framework with JWT authentication
- CORS enabled
- Cache and Celery configured (optional)
- Database: SQLite (changeable)

### urls.py
- API routes: `/api/` prefix
- Cart routes: `/api/cart/`
- Order routes: `/api/orders/`
- Products routes: `/api/products/`
- Auth routes: `/api/auth/`

---

## ✨ Summary

The backend is now **fully functional** with:
- ✅ 50+ eco-friendly products in database
- ✅ Complete e-commerce workflow (browse → cart → checkout)
- ✅ JWT authentication for security
- ✅ Trending algorithm for featured products
- ✅ Price predictions using ML
- ✅ Advanced search (intent-based + visual)
- ✅ User profiles and order history
- ✅ Proper error handling
- ✅ RESTful API design
- ✅ Frontend integration ready

The application is ready for:
- User testing
- Feature refinement
- Performance optimization
- Production deployment
