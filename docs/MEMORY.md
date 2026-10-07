# EcoNext — Engineering Context, Gotchas & Memory Knowledge Base

**Document Version**: 2.4.0  
**Target Audience**: Developers, Maintainers, Interviewers, and Technical Evaluators  
**Scope**: Operational Context, Historical Bug Post-Mortems, Gotchas, and Architectural Quirks  

---

## 1. System Topology & Operational Credentials Quick Reference

| Environment / Service | Host / Port | Credentials / Notes | Purpose |
| :--- | :--- | :--- | :--- |
| **API Gateway Ingress** | `http://127.0.0.1:8080` | Reverse proxy | Primary ingress for frontends and external callers |
| **Django Core Backend** | `http://127.0.0.1:8000` | Superuser: `ADMIN_USERNAME=<configured locally>` | Catalog, ML engine, Gemini Copilot |
| **Order Operations Service** | `http://127.0.0.1:8084` | Bearer Token auth | Fulfillment, shipments, drivers, delivery OTP |
| **Admin & Staff Service** | `http://127.0.0.1:8081` | Staff SSOT | Administrative authentication & RBAC/PBAC |
| **Customer Storefront UI** | `http://localhost:5173` | React 19 / Vite | Customer e-commerce experience |
| **Admin Operations Portal** | `http://localhost:5174` | React 19 / Vite | Logistics, fleet GPS, order management |
| **MySQL 8.0 Server** | `localhost:3306` | User: `root` / `MYSQL_PASSWORD=<configured locally>` | Relational multi-schema database cluster |
| **Redis 7 Cache** | `localhost:6379` | Default / `REDIS_PASSWORD=<configured locally>` | Cache, rate limits, OTP ephemeral storage |
| **Kafka Broker (KRaft)** | `localhost:9092` | PLAINTEXT | Distributed event bus |
| **Admin Staff Login** | `POST /api/admin/auth/login`| `ADMIN_USERNAME=<configured locally>` / `ADMIN_PASSWORD=<configured locally>` | Returns JWT Bearer token with `ROLE_ADMIN` |

---

## 2. Critical Engineering Gotchas & How They Were Solved

### Gotcha 1: JPA/Hibernate Orphan-Removal Collection Replacement
- **Problem**: When allocating line items to a persisted shipment (`shipment.setItems(newList)`), Hibernate threw:
  ```text
  Internal order service error: A collection with cascade="all-delete-orphan" was no longer referenced by the owning entity instance: com.econext.order.entity.Shipment.items
  ```
- **Root Cause**: In JPA, entities mapped with `@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)` maintain an internal persistent collection proxy (`PersistentBag`). Replacing the reference with a newly instantiated `ArrayList` breaks Hibernate's tracking of existing child entities.
- **Solution Pattern**:
  Always mutate the existing list reference rather than replacing it:
  ```java
  if (shipment.getItems() == null) {
      shipment.setItems(new ArrayList<>());
  }
  for (OperationalOrderItem it : order.getItems()) {
      shipment.getItems().add(ShipmentItem.builder()...build());
  }
  ```

---

### Gotcha 2: Foreign Key Constraint on 0-Order Open Shipment Buffers
- **Problem**: Creating a planned shipment buffer prior to customer order assignment failed with database constraint violations.
- **Root Cause**: The MySQL `shipments` table defined `order_id BIGINT NOT NULL` as an artifact of early single-order shipment designs.
- **Solution Pattern**:
  - Executed `ALTER TABLE shipments MODIFY COLUMN order_id BIGINT NULL;`.
  - Added `@OneToMany` mapping `assignedOrders` to support consolidated multi-order clustering while leaving legacy `order_id` nullable.

---

### Gotcha 3: Frontend Axios Error Masking as False Authentication Errors
- **Problem**: When a downstream microservice returned an HTTP 500 error (e.g., Hibernate validation or database exception), the Admin Portal UI displayed:
  ```text
  "Authentication service is temporarily unavailable."
  ```
- **Root Cause**: The Axios response interceptor in `admin-frontend/src/api/client.js` caught any failed network or 5xx response and assumed the token refresh / auth service was down.
- **Solution Pattern**:
  Updated `admin-frontend/src/api/client.js` to only trigger auth failure notifications for genuine `401 Unauthorized` or `403 Forbidden` statuses, while preserving and surfacing actual HTTP 500 backend error messages to the dispatcher.

---

### Gotcha 4: Consolidated Multi-Order Sequential Delivery OTP Verification
- **Problem**: In shipments carrying multiple assigned customer orders (e.g., `ORD-00095` and `ORD-00096`), sending and verifying an OTP for the second order threw:
  ```text
  "Order #123 is already DELIVERED."
  ```
- **Root Cause**: `DeliveryOtpService.generateAndSendOtp` took only `shipmentId` and defaulted to `shipment.getAssignedOrders().get(0)`. Because index 0 had already been delivered, subsequent calls attempted to re-deliver the already-delivered package.
- **Solution Pattern**:
  - Overloaded `generateAndSendOtp` and `verifyDeliveryOtp` to accept an optional `targetOrderId`.
  - When no explicit `targetOrderId` is passed, the service filters for the first non-delivered order:
    ```java
    order = shipment.getAssignedOrders().stream()
            .filter(o -> o.getCurrentStatus() != OrderStatus.DELIVERED)
            .findFirst()
            .orElse(shipment.getAssignedOrders().get(0));
    ```
  - For the shipment itself, `shipmentService.updateShipmentStatus(..., DELIVERED)` and fleet resource release are triggered only when **all** orders in the shipment reach `DELIVERED`.

---

### Gotcha 5: High-Resiliency Redis Ephemeral Fallback
- **Problem**: When developing or running without Redis actively running on port 6379, OTP generation previously failed.
- **Solution Pattern**:
  `DeliveryOtpService` implements a dual-layer caching strategy:
  1. Primary: Redis key-value store with TTL.
  2. Fallback: Internal thread-safe `ConcurrentHashMap` in-memory cache (`inMemoryOrderOtpStore` and `inMemoryShipmentOtpStore`).
  If Redis connectivity fails, the service logs a warning and smoothly fulfills OTP generation and verification from memory without disrupting user operations.

---

### Gotcha 6: Windows PowerShell Console Encoding
- **Problem**: Running Python test scripts on Windows CMD/PowerShell failed with:
  ```text
  UnicodeEncodeError: 'charmap' codec can't encode character '\u2192' in position ...
  ```
- **Root Cause**: The standard Windows command prompt uses legacy code page `cp1252` which cannot render Unicode route arrows (`→`).
- **Solution Pattern**:
  Include `sys.stdout.reconfigure(encoding='utf-8')` at the beginning of all automation scripts.

---

## 3. Recurring Architectural Patterns

### Pattern A: On-Demand Django Order Sync
When `order-operations-service` receives an allocation request for an order that was placed via the customer storefront in Django, it checks its local operational cache:
```java
OperationalOrder order = orderRepository.findById(request.getOrderId())
        .or(() -> orderRepository.findByDjangoOrderId(request.getOrderId()))
        .orElseGet(() -> {
            OperationalOrder fetched = djangoOrderSyncService.fetchOrderFromDjango(request.getOrderId());
            if (fetched != null) {
                return orderRepository.save(fetched);
            }
            return null;
        });
```
This guarantees eventual consistency without requiring distributed two-phase commits across Spring Boot and Django.

### Pattern B: Staff Role Resolution for Auditing
All operational actions resolve the acting staff member's role dynamically:
- Super Admin: System-wide authority.
- Logistics Dispatcher: Corridor routing, truck/driver scheduling.
- Delivery Agent: Final-mile OTP verification.
Every status change is attributed to the acting username and role in append-only event logs (`shipment_events`, `order_status_transitions`, `delivery_verification_audits`).
