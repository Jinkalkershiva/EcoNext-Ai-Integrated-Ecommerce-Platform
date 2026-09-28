# EcoNext Microservices Ecosystem (`microservices`)

[![Java](https://img.shields.io/badge/Java-21%20LTS-orange.svg?logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Cloud](https://img.shields.io/badge/Spring%20Cloud-2023.0.3-green.svg)](https://spring.io/projects/spring-cloud)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-3.7%20KRaft-black.svg?logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7%20Alpine-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![Build Status](https://img.shields.io/badge/Build-Passing%20(100%25%20Verified)-success.svg)]()

The **EcoNext Microservices Architecture** is an enterprise-grade distributed system built with **Java 21 LTS** and **Spring Boot 3.3.4**. It decouples the core e-commerce business domains into scalable, fault-tolerant bounded contexts orchestrated via a reactive **Spring Cloud Gateway**, real-time **Apache Kafka KRaft** messaging, and **STOMP WebSocket** streaming.

---

## 📌 Microservices Port & Responsibility Matrix

```
+-----------------------------------------------------------------------------------------+
|                               API GATEWAY (Port 8080)                                   |
+-----------------------------------------------------------------------------------------+
   │              │              │              │              │              │
   ▼              ▼              ▼              ▼              ▼              ▼
:8085          :8084          :8082          :8081          :8083          :8087
admin-staff   order-ops      catalog-ops     auth-svc       cart-svc       payment-svc
   │              │              │              │              │              │
   ▼              ▼              ▼              ▼              ▼              ▼
auth_db        order_db       catalog_db     auth_db        cart_db        payment_db
```

| Service Module | Ingress Port | Primary Responsibilities | Database Schema |
| :--- | :---: | :--- | :--- |
| **`api-gateway`** | **`8080`** | Reactive edge reverse proxy, non-blocking routing, CORS management, and legacy fallback bridge to Django (`:8000`). | N/A (Stateless) |
| **`admin-staff-service`** | **`8085`** | **Single Source of Truth (SSOT)** for Admin & Staff identity, stateless JWT issuance, RBAC/PBAC permissions, staff provisioning, and forensic audit logging. | `econext_auth_db` |
| **`order-operations-service`** | **`8084`** | 10-stage sequential order state machine, physical GPS `Shipment` tracking, container management, STOMP `/ws-tracking` WebSocket server, and fulfillment analytics. | `econext_order_db` |
| **`catalog-operations-service`** | **`8082`** | Product catalog management, SKU inventory adjustments, category taxonomy, and low-stock threshold triggers. | `econext` |
| **`auth-service`** | **`8081`** | Customer authentication, BCrypt password validation, JWT token creation, and refresh token rotation. | `econext_auth_db` |
| **`cart-service`** | **`8083`** | Shopping cart lifecycle, item quantities, pricing calculations, and discount application. | `econext_cart_db` |
| **`payment-service`** | **`8087`** | Razorpay SDK order generation, cryptographic HMAC-SHA256 signature verification, and payment event publishing. | `econext_payment_db` |
| **`data-import-analysis-service`**| **`8086`** | High-throughput batch catalog ingestion via Apache POI (Excel `.xlsx`/`.xls`) and OpenCSV. | `econext_analytics_db` |
| **`notification-service`** | **`8089`** | Real-time Kafka event listener dispatching customer alerts and order state transition notifications. | `econext_notification_db`|

---

## 🔐 Admin & Staff Authority & Security Model

`admin-staff-service` (`:8085`) is the **authoritative backend** for administrative operations.

### 8 Supported Operational Roles:
1. **`ROLE_ADMIN`**: Full administrator governance, staff account provisioning, role assignment, system health, and audit logs.
2. **`INVENTORY_MANAGER`**: Stock level audits, warehouse replenishments, inventory threshold adjustments.
3. **`CATALOG_MANAGER`**: SKU creation, product categorization, price updates, sustainability tags.
4. **`ORDER_MANAGER`**: Order lifecycle oversight, fulfillment assignment, cancellation handling.
5. **`ORDER_PROCESSING_STAFF`**: Order picking, packing, and status transitions.
6. **`DATA_ANALYST`**: Conversion analytics, sales charts, telemetry reporting.
7. **`DATA_ENTRY_STAFF`**: Batch CSV/Excel ingestion, product data sanitation.
8. **`DELIVERY_STAFF`**: Route inspection, shipment handoffs, proof-of-delivery updates.

---

## 🚚 Physical Shipment & Real-Time GPS Tracking Architecture

The fulfillment domain strictly differentiates between an **`Order`** (commercial transaction) and a **`Shipment`** (physical logistics vehicle movement):

```
Order
 ├── OrderItems
 └── Shipments (GPS Trackable Movement)
      ├── ShipmentItems -> OrderItems
      ├── trackingNumber (e.g., "TRK-EXP-101")
      ├── carrierName (e.g., "EcoExpress Logistics")
      ├── vehicleNumber / truck info
      ├── driverName & driverPhone
      ├── origin & destination
      ├── currentLatitude & currentLongitude
      ├── lastLocationUpdate
      └── LogisticsTrackingEvent history (Waypoints & timestamps)
```

### 1. Kafka Fulfillment Event Topics
- **`shipment.status.updated`**: Published whenever a shipment transitions (`PENDING`, `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `EXCEPTION`).
- **`shipment.location.updated`**: Real-time vehicle GPS coordinate updates (`shipmentId`, `latitude`, `longitude`, `speed`, `timestamp`).
- **`container.status.updated`**: Container consolidation and multimodal transport updates.

### 2. WebSocket / STOMP Feeds (`/ws-tracking`)
`order-operations-service` hosts a STOMP broker (SockJS enabled) at `/ws-tracking`:
- `/topic/orders/{orderId}`: Live customer-facing order status updates.
- `/topic/shipments/{shipmentId}`: Live GPS telemetry and route coordinates for a specific shipment.
- `/topic/containers/{containerId}`: Container tracking updates.
- `/topic/fulfillment/activity`: Live operational event stream for the Admin Command Center.
- `/topic/fulfillment/analytics`: Live KPI metrics for fulfillment dashboards.

---

## 🐳 Docker Infrastructure Orchestration

The platform relies on containerized infrastructure managed via Docker Compose:

```bash
cd microservices
docker compose up -d
```

### Exposed Infrastructure Ports:
- **MySQL 8.0**: `localhost:3306` (Root user: `root`, password configured via environment)
- **Redis 7 (Alpine)**: `localhost:6379`
- **Apache Kafka (KRaft Mode)**: `localhost:9092`
- **Kafka-UI Dashboard**: `http://localhost:8088/` (Real-time topic inspector)

---

## 🛠️ Build & Development Commands

### Prerequisites
- OpenJDK 21 LTS
- Apache Maven 3.9+
- Docker Desktop

### 1. Compile All Modules
```bash
cd microservices
mvn clean compile
```

### 2. Run Test Suites
```bash
# Run all unit and integration tests across all microservices
mvn test

# Run tests for a specific service
mvn test -pl order-operations-service
mvn test -pl admin-staff-service
mvn test -pl api-gateway
```

### 3. Run Individual Microservices
```bash
# API Gateway (:8080)
mvn spring-boot:run -pl api-gateway

# Admin & Staff Service (:8085)
mvn spring-boot:run -pl admin-staff-service

# Order Operations Service (:8084)
mvn spring-boot:run -pl order-operations-service

# Catalog Operations Service (:8082)
mvn spring-boot:run -pl catalog-operations-service

# Payment Service (:8087)
mvn spring-boot:run -pl payment-service
```

---

## 📁 Repository Structure

```
microservices/
├── pom.xml                               # Master multi-module Maven POM
├── docker-compose.yml                    # Containerized MySQL, Redis, Kafka, Kafka-UI
├── api-gateway/                          # Port 8080 - Spring Cloud Gateway & Netty Ingress
├── admin-staff-service/                  # Port 8085 - Authoritative Admin/Staff Identity & RBAC
├── order-operations-service/             # Port 8084 - GPS Shipments, 10-Stage Fulfillment, STOMP
├── catalog-operations-service/           # Port 8082 - SKU Inventory & Category Management
├── auth-service/                         # Port 8081 - Customer Auth & JWT Issuance
├── cart-service/                         # Port 8083 - Stateful Shopping Cart Lifecycle
├── payment-service/                      # Port 8087 - Razorpay SDK & Event Publishing
├── data-import-analysis-service/         # Port 8086 - Batch Excel / CSV Ingestion (Apache POI)
└── notification-service/                 # Port 8089 - Kafka Event Consumer & Alert Dispatcher
```
