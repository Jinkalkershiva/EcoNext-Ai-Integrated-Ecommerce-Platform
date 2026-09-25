# EcoNext Shopping Cart Microservice Specification (`cart-service`)

## 1. Domain Responsibility
The **Cart Service** manages user shopping carts, cart items, quantities, and price aggregations for the EcoNext platform.
- **Port**: `8083`
- **Context Path**: `/api/cart`
- **Database Ownership**: `econext_cart_db` (Isolated MySQL 8.x database)
- **Bounded Context**: Independent persistence and lifecycle for active customer shopping carts. Decoupled from monolith `shop_cart` Django app.

---

## 2. Entities & Schema (Persistence Layer)

### `Cart` (`carts` table)
- `id` (`BIGINT AUTO_INCREMENT`, Primary Key)
- `user_id` (`BIGINT`, Unique, Indexed)
- `created_at` (`DATETIME(6)`, Default: `CURRENT_TIMESTAMP(6)`)
- `updated_at` (`DATETIME(6)`, Default: `CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`)

### `CartItem` (`cart_items` table)
- `id` (`BIGINT AUTO_INCREMENT`, Primary Key)
- `cart_id` (`BIGINT`, Foreign Key $\rightarrow$ `carts.id`, Cascade Delete, Indexed)
- `product_id` (`BIGINT`, Indexed)
- `product_name` (`VARCHAR(255)`)
- `product_image` (`VARCHAR(500)`)
- `unit_price` (`DECIMAL(10,2)`)
- `quantity` (`INT`, Validation: $1 \le \text{quantity} \le 99$)
- `added_at` (`DATETIME(6)`, Default: `CURRENT_TIMESTAMP(6)`)
- `updated_at` (`DATETIME(6)`, Default: `CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`)
- **Constraints**: Unique index on `(cart_id, product_id)` preventing duplicate rows for the same product in a cart.

---

## 3. API Contract & Endpoints

All responses preserve full backwards compatibility with the existing React frontend contract:

| Method | Endpoint | Auth Required | Request Body | Response Shape | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/cart/` | Yes (Bearer Token) | None | `{"status": "success", "cart": {...}}` | `200 OK` |
| `POST` | `/api/cart/add/` | Yes (Bearer Token) | `{"product_id": 1, "quantity": 2, "product_name": "...", "unit_price": 19.99}` | `{"status": "success", "message": "...", "cart": {...}}` | `201 Created` |
| `PUT / PATCH` | `/api/cart/item/{id}/` | Yes (Bearer Token) | `{"quantity": 3}` (quantity 0 removes item) | `{"status": "success", "cart": {...}}` | `200 OK` |
| `DELETE` | `/api/cart/item/{id}/` or `/api/cart/item/{id}/delete/` | Yes (Bearer Token) | None | `{"status": "success", "message": "Item removed from cart.", "cart": {...}}` | `200 OK` |
| `POST / DELETE` | `/api/cart/clear/` | Yes (Bearer Token) | None | `{"status": "success", "message": "Cart cleared.", "cart": {...}}` | `200 OK` |

---

## 4. Security & Stateless JWT Verification

1. **Decentralized Verification**: `cart-service` does NOT execute cross-database queries or call `auth-service` synchronously over HTTP for token validation.
2. **Cryptographic Validation**: Validates the incoming JWT using the shared HMAC-SHA256 signature secret (`app.jwt.secret`).
3. **Identity Extraction**: Extracts `user_id`, `username`, and `role` claims to populate a secure Spring Security `UserPrincipal`.
4. **Endpoint Protection**: All cart mutating and reading operations require valid user authentication. Actuator health check (`/actuator/health`) is publicly accessible for gateway health monitors.

---

## 5. Gateway Integration & Route Precedence

`api-gateway` routes traffic dynamically:
```yaml
- id: cart-service-route
  uri: ${CART_SERVICE_URL:http://localhost:8083}
  predicates:
    - Path=/api/cart/**
  order: 3
```

- When `cart-service` is running on port 8083, all cart operations (`/api/cart/**`) are routed with priority `order: 3` to the Spring Boot microservice.
- Orders (`/api/orders/**`) and Product catalog (`/api/products/**`) remain seamlessly routed to their respective targets or fallback to Django monolith.

---

## 6. Running and Testing Locally

### Prerequisites
- MySQL 8.0 running on `localhost:3306` with database `econext_cart_db`.
- Java 21 JDK + Maven 3.9+.

### Run Cart Service
```bash
cd microservices/cart-service
mvn spring-boot:run
```

### Run All Microservice Tests
```bash
cd microservices
mvn test
```
