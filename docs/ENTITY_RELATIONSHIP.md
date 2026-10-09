# EcoNext — Database Entity-Relationship (ER) Documentation & Schemas

**Document Version**: 2.0.0  
**Scope**: Multi-Schema Relational Data Model, MySQL 8.0 Physical DDL Mappings, and Logical Cross-Service Boundaries.

---

## 1. Architectural Database Stratification & Separation

EcoNext adheres strictly to the **Database-per-Service** architectural pattern. Relational integrity constraints (foreign keys, cascade rules, unique indexes) are strictly maintained **within** each service's isolated schema.

Cross-service references (such as an order referencing a customer ID, or a shipment referencing a Django order ID) operate as **logical IDs** and are coordinated via REST synchronization or asynchronous Apache Kafka events.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                MySQL 8.0 Cluster Schemas                               │
├──────────────────────┬──────────────────────┬───────────────────┬──────────────────────┤
│ 1. econext (Django)  │ 2. econext_order_db  │ 3. econext_auth_db│ 4. Other Microservice│
│    • Product Catalog │    • OperationalOrder│    • Staff Members│    Schemas:          │
│    • Orders & Returns│    • Shipments       │    • RBAC Roles   │    • econext_pay_db  │
│    • Shipments & AWB │    • Drivers & Fleet │    • Permissions  │    • econext_cart_db │
│    • Refunds Ledger  │    • Telemetry Events│    • Audit Logs   │    • econext_notif_db│
└──────────────────────┴──────────────────────┴───────────────────┴──────────────────────┘
```

---

## 2. Core Monolithic Schema: `econext` (Django 5.1)

The `econext` schema serves as the primary system of record for product taxonomy, pricing history, transactional orders, reverse logistics, and customer profiles.

### 2.1 Schema Entity-Relationship Diagram (Physical Foreign Keys)

```mermaid
erDiagram
    auth_user ||--|| accounts_userprofile : "has profile"
    auth_user ||--o{ accounts_useraddress : "owns addresses"
    auth_user ||--o{ accounts_activitylog : "generates logs"
    auth_user ||--o{ order_service_order : "places orders"
    auth_user ||--o{ order_service_orderreturn : "requests returns"
    auth_user ||--o{ products_productreview : "writes reviews"
    auth_user ||--|| shop_cart_cart : "owns cart"

    products_category ||--o{ products_subcategory : "has subcategories"
    products_category ||--o{ products_product : "categorizes"
    products_subcategory ||--o{ products_product : "classifies"
    products_product ||--o{ products_productvariant : "offers variants"
    products_product ||--o{ products_pricehistory : "tracks prices"
    products_product ||--o{ products_productreview : "receives reviews"
    products_productreview ||--o{ products_reviewimage : "attaches images"

    shop_cart_cart ||--o{ shop_cart_cartitem : "contains items"
    products_product ||--o{ shop_cart_cartitem : "item product"
    products_productvariant ||--o{ shop_cart_cartitem : "item variant"

    order_service_order ||--o{ order_service_orderitem : "contains items"
    order_service_order ||--o{ order_service_orderstatushistory : "tracks transitions"
    order_service_order ||--o{ order_service_orderreturn : "has return requests"
    order_service_order ||--o{ order_service_refundtransaction : "refunds"
    order_service_order ||--o{ order_service_shipment : "outbound shipments"
    order_service_order ||--o{ order_service_deliveryverificationaudit : "delivery audits"

    order_service_orderitem ||--o{ order_service_shipmentitem : "allocated to"
    order_service_orderitem ||--o{ order_service_orderreturn : "returned item"
    products_product ||--o{ order_service_orderitem : "referenced product"
    products_productvariant ||--o{ order_service_orderitem : "referenced variant"

    order_service_container ||--o{ order_service_shipment : "holds shipments"
    order_service_shipment ||--o{ order_service_shipmentitem : "manifest items"
    order_service_shipment ||--o{ order_service_shipmentevent : "audit events"
    order_service_shipment ||--o{ order_service_logisticstrackingevent : "geo events"
    order_service_shipment ||--o{ order_service_orderreturn : "reverse shipment"

    order_service_orderreturn ||--o{ order_service_refundtransaction : "linked refund"
```

### 2.2 Table Definitions & Core Attributes (`econext`)

| Table Name | Primary Key | Key Foreign Keys | Key Attributes & Constraints |
| :--- | :--- | :--- | :--- |
| `auth_user` | `id` | None | `username` (UQ), `email` (UQ), `password`, `is_staff`, `is_superuser` |
| `accounts_userprofile` | `id` | `user_id` $\rightarrow$ `auth_user.id` (1:1) | `phone`, `address`, `city`, `preferences` (JSON) |
| `accounts_useraddress` | `id` | `user_id` $\rightarrow$ `auth_user.id` | `full_name`, `address_line`, `city`, `zipcode`, `is_default` |
| `products_category` | `id` | None | `name` (UQ), `description` |
| `products_subcategory`| `id` | `category_id` $\rightarrow$ `products_category.id` | `name` |
| `products_product` | `id` | `category_id`, `subcategory_id` | `name`, `current_price`, `stock`, `tags` (JSON), `status`, `return_eligible` |
| `products_productvariant` | `id` | `product_id` $\rightarrow$ `products_product.id` | `size`, `color`, `sku`, `price`, `stock`, `is_active` |
| `order_service_order` | `id` | `user_id` $\rightarrow$ `auth_user.id` | `order_number` (UQ), `status`, `total_amount`, `payment_method`, `tracking_number` |
| `order_service_orderitem` | `id` | `order_id`, `product_id`, `variant_id` | `quantity`, `price_at_purchase`, `weight_kg`, `return_eligible` |
| `order_service_orderreturn`| `id` | `order_id`, `order_item_id`, `user_id` | `status`, `carrier_name`, `tracking_number`, `pickup_scheduled_at`, `inspection_passed` |
| `order_service_shipment` | `id` | `order_id`, `container_id` | `shipment_number` (UQ), `status`, `vehicle_number`, `carrier_name`, `tracking_number` |
| `order_service_shipmentitem`| `id` | `shipment_id`, `order_item_id` | `quantity` |
| `refund_transactions` | `id` | `order_id`, `order_return_id`, `user_id` | `refund_id` (UQ), `amount`, `status`, `idempotency_key` (UQ), `provider_refund_id` |

---

## 3. Operations & Logistics Schema: `econext_order_db` (Spring Boot 8084)

The `order-operations-service` maintains the state machine for operational warehouse fulfillment, container sorting, vehicle telemetry, driver assignments, and delivery verification audits.

### 3.1 Schema Entity-Relationship Diagram

```mermaid
erDiagram
    operational_orders ||--o{ operational_order_items : "contains"
    containers ||--o{ shipments : "consolidates"
    shipments ||--o{ shipment_items : "contains items"
    shipments ||--o{ shipment_events : "status audit"
    shipments ||--o{ logistics_tracking_events : "telemetry"
    logistics_drivers ||--o{ shipments : "dispatched with"

    operational_orders {
        bigint id PK
        bigint customer_id
        varchar customer_username
        varchar current_status
        decimal total_amount
        bigint shipment_id
    }

    operational_order_items {
        bigint id PK
        bigint operational_order_id FK
        bigint product_id
        varchar product_name
        int quantity
        decimal unit_price
    }

    order_return_requests {
        bigint id PK
        bigint order_id
        bigint order_item_id
        bigint customer_id
        varchar status
        decimal refund_amount
        datetime requested_at
    }

    containers {
        bigint id PK
        varchar container_code UK
        varchar status
        varchar origin
        varchar destination
        decimal current_latitude
        decimal current_longitude
    }

    shipments {
        bigint id PK
        varchar shipment_number UK
        bigint order_id
        bigint container_id FK
        varchar status
        varchar tracking_number
        varchar vehicle_number
        bigint driver_id
    }

    shipment_items {
        bigint id PK
        bigint shipment_id FK
        bigint order_item_id
        int quantity
    }

    logistics_drivers {
        bigint id PK
        varchar driver_code UK
        varchar name
        varchar phone
        varchar status
        varchar current_vehicle_number
        bigint assigned_shipment_id
    }

    delivery_verification_audits {
        bigint id PK
        bigint order_id
        bigint shipment_id
        varchar verification_method
        varchar verified_by
        varchar new_status
        datetime timestamp
    }
```

---

## 4. Administrative & Governance Schema: `econext_auth_db` (Spring Boot 8085 / 8081)

The `admin-staff-service` manages operational governance, departmental role assignments, and immutable audit logs. The `auth-service` manages customer JWT authentication.

### 4.1 Schema Entity-Relationship Diagram

```mermaid
erDiagram
    admin_staff_members ||--o{ admin_staff_permissions : "custom overrides"
    admin_roles ||--o{ admin_role_permissions : "role grants"
    users ||--|| user_profiles : "profile"
    users ||--|| user_preferences : "preferences"

    admin_staff_members {
        bigint id PK
        varchar username UK
        varchar email UK
        varchar name
        varchar password_hash
        varchar role_name
        varchar status
        boolean must_change_password
    }

    admin_roles {
        bigint id PK
        varchar name UK
        varchar description
        boolean is_system_role
    }

    admin_role_permissions {
        bigint role_id FK
        varchar permission
    }

    admin_staff_permissions {
        bigint staff_id FK
        varchar permission
    }

    admin_audit_logs {
        bigint id PK
        bigint actor_id
        varchar actor_username
        varchar actor_role
        varchar action
        varchar resource_type
        varchar resource_id
        text details
        datetime timestamp
    }

    users {
        bigint id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar role
        boolean is_active
    }
```

---

## 5. Other Bounded Context Schemas

### 5.1 `econext_payment_db` (`payment-service` Port 8087)
* **`payment_transactions`**: `id` (PK), `order_id` (Logical FK), `user_id`, `razorpay_order_id`, `razorpay_payment_id`, `amount`, `status` (`CREATED`, `SUCCESS`, `FAILED`), `payment_method`.
* **`refund_transactions`**: `id` (PK), `refund_id` (UK), `order_id` (Logical FK), `payment_id`, `amount`, `status` (`PENDING`, `SUCCESS`, `FAILED`), `idempotency_key` (UK).

### 5.2 `econext_cart_db` (`cart-service` Port 8083)
* **`carts`**: `id` (PK), `user_id` (UK, Logical FK), `created_at`, `updated_at`.
* **`cart_items`**: `id` (PK), `cart_id` (FK $\rightarrow$ `carts.id`), `product_id` (Logical FK), `quantity`, `unit_price`, `added_at`.

### 5.3 `econext_notification_db` (`notification-service` Port 8089)
* **`notifications`**: `id` (PK), `user_id` (Logical FK), `type`, `title`, `message`, `reference_id`, `is_read`, `created_at`.

### 5.4 `econext_analytics_db` (`data-import-analysis-service` Port 8086)
* **`operational_import_jobs`**: `id` (PK), `filename`, `file_type`, `total_records`, `valid_records`, `imported_records`, `failed_records`, `status`, `staff_username`.

---

## 6. Logical Cross-Service Boundaries & Foreign Keys

To prevent monolithic lock-in and enable zero-downtime microservice horizontal scaling, cross-schema foreign keys are handled at the application layer:

| Source Entity / Schema | Target Entity / Schema | Logical Key | Mechanism / Protocol |
| :--- | :--- | :--- | :--- |
| `operational_orders.customer_id` | `econext.auth_user.id` | `customer_id` | JWT Claim propagation (`sub`) |
| `operational_orders.order_id` | `econext.order_service_order.id` | `order_id` | REST Fetch (`DjangoOrderSyncService`) |
| `payment_transactions.order_id` | `econext.order_service_order.id` | `order_id` | REST Verify / Kafka Event |
| `carts.user_id` | `econext.auth_user.id` | `user_id` | JWT Claim (`sub`) |
| `notifications.user_id` | `econext.auth_user.id` | `user_id` | Kafka Notification Payload |
| `admin_audit_logs.actor_id` | `admin_staff_members.id` | `actor_id` | Spring Security Principal |
