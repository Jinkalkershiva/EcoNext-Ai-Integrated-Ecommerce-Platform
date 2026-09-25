# EcoNext Auth & User Microservice Specification (`auth-service`)

## 1. Domain Responsibility
The **Auth Service** is the identity provider, authentication engine, and user profile management microservice for the EcoNext platform.
- **Port**: `8081`
- **Context Path**: `/api/auth`
- **Database Ownership**: `econext_auth_db` (Isolated MySQL 8.x database)

---

## 2. Entities & Schema (Persistence Layer)

### `User` (`users` table)
- `id` (BIGINT AUTO_INCREMENT, Primary Key)
- `username` (VARCHAR(150), Unique, Indexed)
- `email` (VARCHAR(254), Unique, Indexed)
- `password_hash` (VARCHAR(128), BCrypt hashed)
- `first_name` (VARCHAR(150))
- `last_name` (VARCHAR(150))
- `role` (VARCHAR(50), Default: `ROLE_USER`)
- `is_active` (BOOLEAN, Default: `true`)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### `UserProfile` (`user_profiles` table)
- `id` (BIGINT AUTO_INCREMENT, Primary Key)
- `user_id` (BIGINT, Unique FK to `users.id`)
- `phone` (VARCHAR(20))
- `address` (TEXT)
- `city` (VARCHAR(100))
- `state` (VARCHAR(100))
- `zipcode` (VARCHAR(20))
- `country` (VARCHAR(100))
- `preferences` (TEXT JSON)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### `UserPreference` (`user_preferences` table)
- `id` (BIGINT AUTO_INCREMENT, Primary Key)
- `user_id` (BIGINT, Unique FK to `users.id`)
- `age_group` (VARCHAR(50))
- `gender_category` (VARCHAR(50))
- `budget_min` (DECIMAL(10,2))
- `budget_max` (DECIMAL(10,2))
- `preferred_categories` (TEXT JSON)
- `eco_preferences` (TEXT JSON)
- `color_preferences` (TEXT JSON)
- `style_preferences` (TEXT JSON)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

---

## 3. API Contract & Endpoints

| Method | Endpoint | Auth Required | Request Body | Response Payload | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup/` | No | `SignUpRequest` (`username`, `email`, `password`, `first_name`, `last_name`) | `AuthResponse` with `user`, `tokens` | `201 Created` |
| `POST` | `/api/auth/login/` | No | `LoginRequest` (`username`, `password`) | `AuthResponse` with `user`, `profile`, `tokens` | `200 OK` |
| `POST` | `/api/auth/refresh/` | No | `RefreshTokenRequest` (`refresh`) | `TokenResponse` (`access`, `refresh`) | `200 OK` |
| `POST` | `/api/auth/logout/` | Yes | `LogoutRequest` (optional `refresh`) | `AuthResponse` with `token_revoked: true` | `200 OK` |
| `GET` | `/api/auth/current-user/` | Yes | None (Bearer Header) | `AuthResponse` with `user`, `profile` | `200 OK` |
| `PUT/PATCH` | `/api/auth/profile/update/` | Yes | `UpdateProfileRequest` (`firstName`, `phone`, `city`, etc.) | `AuthResponse` with updated `user`, `profile` | `200 OK` |
| `GET` | `/api/auth/users/{id}` | Yes | None | `UserDto` (Internal service contract) | `200 OK` |

---

## 4. Security & JWT Token Architecture

1. **Password Hashing**: BCrypt (`BCryptPasswordEncoder` with default strength 10).
2. **Access Token**:
   - Algorithm: HMAC-SHA256 (`Keys.hmacShaKeyFor`)
   - Expiration: Configurable via `JWT_ACCESS_EXPIRATION_MS` (Default: 24 Hours)
   - Claims: `sub` (username), `user_id`, `email`, `token_type: access`
3. **Refresh Token**:
   - Expiration: Configurable via `JWT_REFRESH_EXPIRATION_MS` (Default: 7 Days)
   - Claims: `sub` (username), `user_id`, `token_type: refresh`
4. **Stateless Security Filter Chain**:
   - Public whitelist: `/api/auth/signup/**`, `/api/auth/login/**`, `/api/auth/refresh/**`, `/actuator/**`
   - Protected endpoints: `/api/auth/current-user/**`, `/api/auth/profile/**`, `/api/auth/logout/**`

---

## 5. Gateway Integration & Route Precedence

- **Route Configuration**:
  ```yaml
  - id: auth-service-route
    uri: ${AUTH_SERVICE_URL:http://localhost:8081}
    predicates:
      - Path=/api/auth/**
    order: 1
  ```
- **Order Precedence Model**:
  - `auth-service-route`: `order: 1` (`/api/auth/**`)
  - `product-service-route`: `order: 2` (`/api/products/**`, `/api/categories/**`, `/api/kids/**`)
  - `cart-service-route`: `order: 3` (`/api/cart/**`)
  - `order-service-route`: `order: 4` (`/api/orders/**`)
  - `personalization-service-route`: `order: 5` (`/api/personalization/**`)
  - `copilot-service-route`: `order: 6` (`/api/copilot/**`)
  - `django-fallback-route`: `order: 10000` (`/api/**` catch-all fallback to port 8000 during migration)

---

## 6. Architectural Decision Records (ADRs)

### 6.1 ActivityLog Migration Strategy
- **Historical Django ActivityLog**:
  - Historical data from Django's `accounts_activitylog` table is not silently dropped. It will be archived / migrated into the future `econext_analytics_db` using a migration script during the Analytics domain migration.
- **Future User Activity**:
  - Instead of direct SQL foreign-key relationships from `auth-service` to a monolithic activity log table, future microservices will publish domain events (`USER_REGISTERED`, `USER_LOGGED_IN`, `PRODUCT_VIEWED`, `CART_ITEM_ADDED`, `ORDER_CREATED`) to Kafka topics (`user-events`, `catalog-events`, `order-events`).
  - The future `analytics-service` will consume these streams asynchronously, preserving loose coupling and high throughput.

### 6.2 User Preferences Handling
- **Parity with Django**:
  - Django had two representations: `UserProfile.preferences` (generic JSON field in `accounts`) and `UserPreference` (structured entity in `personalization`).
  - `auth-service` maintains full parity:
    1. `user_profiles.preferences` (Text JSON) holds user UI preferences.
    2. `user_preferences` table holds structured personalization attributes (`age_group`, `gender_category`, `budget_min`, `budget_max`, `preferred_categories`, `eco_preferences`, `color_preferences`, `style_preferences`).
  - No existing preference fields are lost, and the React frontend contract is strictly preserved.

### 6.3 Logout Semantics & Token Invalidation
- **Stateless JWT Lifecycle**:
  - In a pure stateless JWT model without a Redis revocation blacklist, Access Tokens expire naturally upon TTL (default: 24 hours).
  - Refresh Tokens are discarded / invalidated upon client logout.
  - When a client sends `POST /api/auth/logout/` with a refresh token, `auth-service` validates the token structure and responds with `token_revoked: true`.
  - Frontend client clears tokens from localStorage/session storage.

### 6.4 JWT Trust Boundary & Zero-Trust Defense-in-Depth
- **Gateway Level**:
  - Routes traffic to appropriate microservices based on URL predicates and performs global CORS handling.
- **Service Level**:
  - Each microservice (e.g. `auth-service`, and future `product-service`, `cart-service`, `order-service`) includes its own `JwtAuthenticationFilter` verifying the HMAC-SHA256 signature and expiration using the centralized `JWT_SECRET`.
  - Services do not rely on unverified upstream plaintext headers, maintaining a strict zero-trust security perimeter.

