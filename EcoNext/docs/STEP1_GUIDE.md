# EcoNext Microservices — Step 1 Architecture & Setup Guide

## 1. Overview of Step 1

Step 1 establishes the foundational enterprise infrastructure for the EcoNext Microservices ecosystem:
- **Parent Multi-Module Maven Project** configured for **Java 21 LTS**, Spring Boot 3.3.4, and Spring Cloud 2023.0.3.
- **Spring Cloud Gateway (`api-gateway`)**: Reactive high-performance gateway serving on port `8080` as the unified entry point for all frontend requests, with global CORS handling and fallback routing.
- **Docker Compose & Database Infrastructure**:
  - **MySQL 8.0**: Configured with automatic initialization of 5 isolated databases (`econext_auth_db`, `econext_product_db`, `econext_cart_db`, `econext_order_db`, `econext_analytics_db`) ensuring domain bounded context persistence.
  - **Redis 7**: Distributed caching, rate-limiting, and ephemeral state store on port `6379`.
  - **Apache Kafka (KRaft Mode)**: Zero-ZooKeeper event bus on port `9092` for asynchronous domain events.
  - **Kafka UI**: Developer console on port `8088` for visual inspection of topics and event streams.

---

## 2. Infrastructure Flow

```
                      React Frontend (:3000)
                                │
                                ▼ HTTP / REST
                 Spring Cloud Gateway (:8080)
                                │
       ┌────────────────────────┼────────────────────────┐
       ▼                        ▼                        ▼
  [ /api/auth/** ]      [ /api/products/** ]      [ /api/cart/** ]
 auth-service (:8081)  product-service (:8082)   cart-service (:8083)
       │                        │                        │
       ▼                        ▼                        ▼
econext_auth_db       econext_product_db        econext_cart_db

  ┌──────────────────────────────────────────────────────────────┐
  │                   ASYNCHRONOUS BACKBONE                      │
  │  Apache Kafka (:9092) ──> Telemetry / Orders / Inventory     │
  │  Redis 7 (:6379)      ──> Distributed Cache & Rate Limiting  │
  └──────────────────────────────────────────────────────────────┘
```

---

## 3. How to Run Step 1 Locally

### Step 3.1: Start Docker Infrastructure
From the `microservices` directory:
```bash
cd microservices
docker compose up -d
```

Verify all containers are healthy:
```bash
docker compose ps
```

### Step 3.2: Build and Run Spring Cloud Gateway
```bash
# Build the multi-module project
mvn clean package

# Run the API Gateway
cd api-gateway
mvn spring-boot:run
```

The Gateway will start on `http://localhost:8080`.

---

## 4. Verification Commands

### 1. Verify Gateway Health and Route Definitions:
```bash
# Check Actuator Health
curl http://localhost:8080/actuator/health

# Check Gateway Routes
curl http://localhost:8080/actuator/gateway/routes
```

### 2. Verify MySQL Databases:
```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'econext%';"
```
You should see: `econext_auth_db`, `econext_product_db`, `econext_cart_db`, `econext_order_db`, `econext_analytics_db`.

### 3. Verify Redis:
```bash
docker exec -it econext-redis redis-cli ping
# Response: PONG
```

### 4. Verify Kafka:
```bash
docker exec -it econext-kafka kafka-topics --bootstrap-server localhost:9092 --list
```
Kafka UI is accessible at `http://localhost:8088`.
