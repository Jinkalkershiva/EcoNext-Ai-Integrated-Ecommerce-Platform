# EcoNext — System Architecture & Technical Blueprint

**Architecture Style**: Distributed Microservices + Polyglot Core (Java Spring Boot + Python Django)  
**Gateway Pattern**: Reactive Edge Routing & Ingress Management (Spring Cloud Gateway)  
**Event Architecture**: Asynchronous Event Streaming (Apache Kafka KRaft) & STOMP WebSockets  
**Database Pattern**: Database-per-Service (Multi-Schema MySQL 8.0 Cluster)  
**Security Model**: Stateless JWT Authentication + 8-Role RBAC/PBAC Authorization  

---

## 1. High-Level System Architecture

The EcoNext platform utilizes a hybrid polyglot architecture combining high-throughput Java 21 / Spring Boot 3.3.4 enterprise microservices for operational fulfillment, payments, cart management, and administrative governance, alongside a Python 3.11 / Django 5.1 core for the catalog taxonomy, machine learning pipelines, and conversational AI.

```
                              ┌─────────────────────────────────────────┐
                              │            Client Ingress               │
                              │   Customer Storefront  (React / Vite)   │
                              │   Admin & Staff Portal (React / Vite)   │
                              └────────────────────┬────────────────────┘
                                                   │
                                                   │ HTTPS / REST / WebSockets
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   Spring Cloud API Gateway (Port 8080 / Reactive Netty)                          │
│   • Central Ingress Routing           • CORS Header Harmonization       • JWT Token Extraction   │
│   • Path Predicates & Filters         • WebSockets Reverse Proxying     • Fallback Route to Core │
└─────────┬───────────────────┬───────────────────┬───────────────────┬───────────────────┬────────┘
          │                   │                   │                   │                   │
          ▼                   ▼                   ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌───────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ admin-staff      │ │ order-operations │ │ payment       │ │ cart             │ │ Django Backend   │
│ service (8081)   │ │ service (8084)   │ │ service (8085)│ │ service (8083)   │ │ Core (8000)      │
│ • Staff SSOT     │ │ • Order Machine  │ │ • Razorpay    │ │ • Fast Cart      │ │ • Product Catalog│
│ • 8-Role RBAC    │ │ • Shipments      │ │ • HMAC-SHA256 │ │ • Redis Session  │ │ • ML Price Pred  │
│ • Staff Auditing │ │ • Containers     │ │ • Webhooks    │ │ • Item Merging   │ │ • Visual Search  │
│ • Roles & Perms  │ │ • Drivers & GPS  │ │               │ │                  │ │ • Gemini Copilot │
│                  │ │ • Delivery OTP   │ │               │ │                  │ │ • Customer Auth  │
└────────┬─────────┘ └────────┬─────────┘ └───────┬───────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                   │                  │                    │
         │                    │                   │                  │                    │
         ▼                    ▼                   ▼                  ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌───────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ econext_auth_db  │ │ econext_order_db │ │ econext_pay_db│ │ econext_cart_db  │ │ econext (MySQL)  │
│ (MySQL Schema)   │ │ (MySQL Schema)   │ │ (MySQL Schema)│ │ (MySQL Schema)   │ │ (Django Schema)  │
└──────────────────┘ └────────┬─────────┘ └───────┬───────┘ └──────────────────┘ └────────┬─────────┘
                              │                   │                                       │
                              └─────────┬─────────┴───────────────────────────────────────┘
                                        │
                                        ▼ Asynchronous Event Bus
                    ┌───────────────────────────────────────────────┐
                    │      Apache Kafka 3.7 Cluster (KRaft Mode)     │
                    │  Topics:                                      │
                    │   • order.lifecycle.events                    │
                    │   • shipment.tracking.events                  │
                    │   • payment.status.events                     │
                    └───────────────────────┬───────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │  notification-service (8086) / STOMP WS       │
                    │   • Email Notification Engine (SMTP)          │
                    │   • Real-Time WebSocket Telemetry             │
                    └───────────────────────────────────────────────┘
```

---

## 2. Port Allocation & Service Topology Matrix

| Component / Service | Technology | Port | Database Schema | Primary Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **`api-gateway`** | Spring Boot / Cloud Gateway | `8080` | None | Unified ingress, route predicate evaluation, CORS deduplication, WebSocket forwarding |
| **`backend` (Django)** | Python 3.11 / Django 5.1 | `8000` | `econext` | Product catalog, pricing, ML engine (CLIP/Linear Regression), Copilot, user addresses |
| **`admin-staff-service`** | Java 21 / Spring Boot 3.3.4 | `8081` | `econext_auth_db` | Authoritative SSOT for administrative governance, 8 operational roles, forensic audit log |
| **`catalog-ops-service`** | Java 21 / Spring Boot 3.3.4 | `8082` | `econext_product_db` | Inventory mutations, stock reservations, product taxonomy sync |
| **`cart-service`** | Java 21 / Spring Boot 3.3.4 | `8083` | `econext_cart_db` | High-throughput distributed cart management, user session merges |
| **`order-operations-service`**| Java 21 / Spring Boot 3.3.4 | `8084` | `econext_order_db` | Order lifecycle state machine, open shipments, trucks, drivers, corridor audits, delivery OTP |
| **`payment-service`** | Java 21 / Spring Boot 3.3.4 | `8085` | `econext_payment_db` | Razorpay order generation, cryptographic HMAC signature verification, refund triggers |
| **`notification-service`** | Java 21 / Spring Boot 3.3.4 | `8086` | `econext_notification_db`| Kafka event consumption, HTML email dispatch, delivery PIN notices |
| **`data-import-service`** | Java 21 / Spring Boot 3.3.4 | `8087` | `econext_analytics_db` | High-speed CSV/Excel parsing, bulk product ingestion, schema validation |
| **`frontend` (Storefront)**| React 19 / Vite 6 | `5173` | None (Client) | Customer web application, responsive e-commerce storefront, order tracking |
| **`admin-frontend`** | React 19 / Vite 6 | `5174` | None (Client) | Administrative and operations dashboard, fulfillment GPS control room, RBAC manager |
| **MySQL 8.0 Cluster** | MySQL Server 8.0 | `3306` | Multi-Schema | Persistent domain-isolated relational data store |
| **Redis 7 Cache** | Redis 7.2 Alpine | `6379` | Ephemeral / Cache | Distributed cache, OTP ephemeral store, token blacklist |
| **Apache Kafka Broker** | Confluent Kafka 7.6 (KRaft) | `9092` | Event Logs | Distributed event streaming broker operating in KRaft mode |

---

## 3. Spring Cloud Gateway Ingress & Route Ordering

Routing in `api-gateway` (`application.yml`) is evaluated sequentially using strict priority ordering:

```yaml
routes:
  - id: auth-service-route        # Order 1: /api/auth/** -> admin-staff-service (8081)
  - id: product-service-route     # Order 2: /api/products/**, /api/categories/** -> Django (8000)
  - id: cart-service-route        # Order 3: /api/cart/** -> cart-service (8083)
  - id: order-service-route       # Order 4: /api/orders/** -> Django (8000)
  - id: payment-service-route     # Order 6: /api/payments/** -> payment-service (8085)
  - id: ai-copilot-route          # Order 8: /api/copilot/**, /api/chat/** -> Django (8000)
  - id: admin-staff-service-route # Order 9: /api/admin/**, /api/staff/** -> admin-staff-service (8081)
  - id: catalog-ops-service-route # Order 10: /api/catalog-ops/** -> catalog-operations-service (8082)
  - id: order-ops-service-route   # Order 11: /api/order-ops/** -> order-operations-service (8084)
  - id: data-import-analysis      # Order 12: /api/import/** -> data-import-analysis-service (8087)
  - id: ws-tracking-route         # Order 13: /ws-tracking/** -> order-operations-service (8084)
  - id: django-fallback-route     # Order 10000: /api/** -> Django (8000) [Fallback Ingress]
```

---

## 4. Database Architecture & Schema Isolation

The project implements the strict **Database-per-Service** design pattern. Direct cross-database joins across bounded contexts are strictly prohibited. Inter-service data sharing occurs exclusively via asynchronous Kafka events or REST API calls.

### Schema Stratification (`docker/init-databases.sql`):
1. **`econext`**: Owned by Django backend. Contains `products_product`, `products_category`, `auth_user`, `accounts_userprofile`, `order_service_order`, `order_service_orderitem`, `ml_engine_pricehistory`.
2. **`econext_auth_db`**: Owned by `admin-staff-service`. Contains `staff_members`, `roles`, `permissions`, `staff_role_mappings`, `role_permission_mappings`, `staff_audit_logs`.
3. **`econext_order_db`**: Owned by `order-operations-service`. Contains `operational_orders`, `operational_order_items`, `shipments`, `shipment_items`, `containers`, `logistics_drivers`, `shipment_events`, `logistics_tracking_events`, `route_exception_audits`, `delivery_verification_audits`.
4. **`econext_payment_db`**: Owned by `payment-service`. Contains `payment_transactions`, `razorpay_orders`, `refund_records`.
5. **`econext_cart_db`**: Owned by `cart-service`. Contains `cart_headers`, `cart_line_items`.
6. **`econext_notification_db`**: Owned by `notification-service`. Contains `notification_logs`, `email_delivery_audits`.
7. **`econext_analytics_db`**: Owned by `data-import-analysis-service`. Contains `batch_import_jobs`, `import_error_logs`.

---

## 5. Security & Authentication Architecture

### 5.1 Dual-Token Ingress Pattern
- **Customer Storefront**: Uses standard Django REST Framework JWT tokens issued upon customer login/signup (`access` token 24-hour validity, `refresh` token 7-day validity).
- **Admin & Staff Portal**: Uses HMAC-SHA384 signed Bearer JWT tokens issued by `admin-staff-service` via `POST /api/admin/auth/login`.

### 5.2 Token Payload & RBAC Context
```json
{
  "sub": "1",
  "username": "admin",
  "name": "EcoNext Administrator",
  "email": "admin@econext.com",
  "role": "ROLE_ADMIN",
  "permissions": [
    "ORDER_READ",
    "ORDER_PROCESS",
    "ORDER_STATUS_UPDATE",
    "STAFF_MANAGE",
    "CATALOG_MANAGE",
    "AUDIT_READ"
  ],
  "iat": 1728300000,
  "exp": 1728386400
}
```

### 5.3 Spring Security Method Interception
Downstream Spring Boot microservices validate the incoming Bearer token using a shared secret via `JwtTokenFilter` and inject `OperationalStaffPrincipal` into Spring's `SecurityContext`. Controller methods enforce security using `@PreAuthorize`:
```java
@PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ORDER_STATUS_UPDATE')")
@PostMapping("/shipments/{id}/dispatch")
public ResponseEntity<ApiResponse<ShipmentResponse>> dispatchShipment(...)
```

---

## 6. Real-Time Telemetry & Event Streaming

### 6.1 Apache Kafka KRaft Architecture
EcoNext runs Confluent Kafka 7.6 in **KRaft mode** (no ZooKeeper dependency). Brokers manage partition metadata natively through internal Quorum controllers.

### 6.2 Key Kafka Topics & Event Types
- **`order.lifecycle.events`**: Published when customer orders transition (`ORDER_CONFIRMED`, `ASSIGNED_TO_SHIPMENT`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`).
- **`shipment.tracking.events`**: Published on shipment dispatch, milestone checkpoint arrival, and delivery verification.
- **`payment.status.events`**: Published when Razorpay webhook confirms payment capture or refund completion.

### 6.3 STOMP WebSocket Broadcasting
Clients subscribe to real-time telemetry over WebSockets via `/ws-tracking/websocket`. The Gateway transparently proxies WebSocket connections directly to `order-operations-service` on port 8084. Updates to physical shipments or vehicle coordinates are broadcast to `/topic/shipments/{id}` and `/topic/orders/{orderId}`.

---

## 7. Reliability, Resiliency & Fallback Strategies

1. **Redis Ephemeral Fallback**:
   - `DeliveryOtpService` attempts to store delivery PINs in Redis cluster `localhost:6379`.
   - If Redis is unavailable, the service automatically falls back to an internal thread-safe `ConcurrentHashMap` in-memory cache without throwing exceptions or interrupting the fulfillment flow.
2. **Django On-Demand Order Sync**:
   - When an order is assigned to a shipment in `order-operations-service`, if the order is not yet present in the operational cache table, `DjangoOrderSyncService` automatically queries Django REST API `http://localhost:8000/api/orders/{id}/`, fetches the order payload, persists it locally, and proceeds with allocation.
3. **Gateway Unmigrated Fallback**:
   - Any request not matching explicit Spring Boot microservice predicates falls back to route `django-fallback-route` (Order `10000`), routing to `http://localhost:8000`.
