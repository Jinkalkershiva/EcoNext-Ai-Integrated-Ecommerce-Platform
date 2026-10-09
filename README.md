# EcoNext — AI-Integrated E-Commerce & Microservices Platform

[![Java](https://img.shields.io/badge/Java-21%20LTS-orange.svg?logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Cloud](https://img.shields.io/badge/Spring%20Cloud-2023.0.3-green.svg)](https://spring.io/projects/spring-cloud)
[![Python](https://img.shields.io/badge/Python-3.11%2B%20%2F%203.13-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.1.6-darkgreen.svg?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React 19](https://img.shields.io/badge/React-19.2.3-cyan.svg?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4.3-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7%20Alpine-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-3.7%20KRaft-black.svg?logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Project Overview & Team

**EcoNext** is an enterprise-grade, sustainable AI-integrated retail platform combining multi-modal machine learning (CLIP visual similarity search, Scikit-learn price forecasting, TF-IDF intent search, and Gemini conversational shopping) with a high-throughput **Java 21 / Spring Boot 3.3.4** microservices architecture, **Spring Cloud API Gateway**, and **React 19** frontends.

* **Final-Year Capstone Project Team**:
  * **Shiva Jinkalker** ([GitHub: @Jinkalkershiva](https://github.com/Jinkalkershiva))
  * **RajputAtul75** ([GitHub: @RajputAtul75](https://github.com/RajputAtul75))

---

## 📚 Technical Documentation & Knowledge Base

Authoritative engineering documentation is organized inside [`docs/`](docs/):

* 🏗️ **[System Architecture](docs/ARCHITECTURE.md)**: Polyglot microservices topology, Spring Cloud Gateway ingress, Kafka KRaft streaming, and database isolation.
* 🗄️ **[Entity-Relationship Model](docs/ENTITY_RELATIONSHIP.md)**: Multi-schema relational data model, MySQL physical DDL, and cross-service logical boundaries.
* 📄 **[Product Requirements Document (PRD)](docs/PRD.md)**: Product vision, user personas, functional specifications, and success KPIs.
* 📏 **[Engineering Rules & Standards](docs/RULES.md)**: Domain invariants, zero ghost orders, JPA/Hibernate collection rules, and coding conventions.
* 🎨 **[System Design & Workflows](docs/DESIGN.md)**: Level-0/1 DFDs, sequence diagrams for Razorpay & fulfillment, and state machine specifications.
* 📋 **[Task Tracking & Roadmap](docs/TASK.md)**: Implementation milestones (Phases 1–4) and automated test matrix.
* 🧠 **[Operational Memory & Gotchas](docs/MEMORY.md)**: Operational credentials, historical bug post-mortems, Hibernate orphan-removal patterns, and Redis fallback strategies.
* 🚀 **[CI/CD & Deployment](docs/CI-CD.md)**: Automated build pipelines, GitHub Actions workflows, and Docker deployment.
* 📦 **[Microservices Guide](microservices/README.md)**: Detailed individual runbooks and endpoints for each Spring Boot service.

---

## 🏗️ High-Level System Architecture

```mermaid
flowchart TD
    subgraph Clients["Client Layer"]
        CustomerStore["Customer Storefront<br/>(React 19 - Port 5173 / 5073)"]
        AdminPortal["Admin & Staff Portal<br/>(React 19 - Port 5174 / 5074)"]
    end

    subgraph Ingress["API Gateway Ingress"]
        Gateway["Spring Cloud Gateway (:8080)<br/>Reactive Netty Edge Router"]
    end

    subgraph Microservices["Spring Boot Microservices (Java 21)"]
        AuthSvc["auth-service (:8081)"]
        CatalogOpsSvc["catalog-operations-service (:8082)"]
        CartSvc["cart-service (:8083)"]
        OrderOpsSvc["order-operations-service (:8084)"]
        AdminStaffSvc["admin-staff-service (:8085)"]
        ImportSvc["data-import-analysis-service (:8086)"]
        PaymentSvc["payment-service (:8087)"]
        NotifSvc["notification-service (:8089)"]
    end

    subgraph Monolith["Django Core & AI Engine (Python 3.11+)"]
        DjangoCore["Django REST Framework Core (:8000)<br/>• Catalog & Orders • Copilot AI • ML Engine"]
    end

    subgraph Persistence["Databases & Messaging"]
        MySQL[("MySQL 8.0 Cluster<br/>Multi-Schema")]
        Redis[("Redis 7 Cache / OTP")]
        Kafka["Apache Kafka KRaft (:9092)"]
    end

    CustomerStore --> Ingress
    AdminPortal --> Ingress

    Gateway -->|/api/auth/**| AuthSvc
    Gateway -->|/api/catalog-ops/**, /api/inventory-ops/**| CatalogOpsSvc
    Gateway -->|/api/cart/**| CartSvc
    Gateway -->|/api/order-ops/**, /ws-tracking/**| OrderOpsSvc
    Gateway -->|/api/admin/**, /api/staff/**| AdminStaffSvc
    Gateway -->|/api/import/**, /api/analytics/**| ImportSvc
    Gateway -->|/api/payments/**| PaymentSvc
    Gateway -->|/api/notifications/**| NotifSvc
    Gateway -->|/api/products/**, /api/copilot/**, /api/** (Fallback)| DjangoCore

    Microservices --> MySQL
    DjangoCore --> MySQL
    DjangoCore --> Redis
    OrderOpsSvc -.-> Kafka
    PaymentSvc -.-> Kafka
    Kafka -.-> NotifSvc
```

---

## 🔌 Port Allocation & Service Directory

| Service / Component | Runtime | Port | Database Schema | Primary Purpose |
| :--- | :--- | :---: | :--- | :--- |
| **API Gateway** | Spring Cloud Gateway | **8080** | None | Central reverse proxy, CORS harmonization, routing |
| **Django Core Backend** | Python 3.11+ / Django 5.1 | **8000** | `econext` | Product taxonomy, orders, ML pricing, Gemini AI Copilot |
| **Auth Service** | Spring Boot 3.3.4 | **8081** | `econext_auth_db` | Customer JWT authentication & account management |
| **Catalog Operations** | Spring Boot 3.3.4 | **8082** | `econext_product_db` | Catalog modifications, stock adjustments & audits |
| **Cart Service** | Spring Boot 3.3.4 | **8083** | `econext_cart_db` | High-throughput shopping cart & session persistence |
| **Order Operations** | Spring Boot 3.3.4 | **8084** | `econext_order_db` | Fulfillment state machine, shipments, GPS tracking, STOMP WS |
| **Admin & Staff Service**| Spring Boot 3.3.4 | **8085** | `econext_auth_db` | Authoritative SSOT for administrative RBAC/PBAC & audit logs |
| **Data Import & Analytics**| Spring Boot 3.3.4 | **8086** | `econext_analytics_db` | Batch CSV/Excel parsing, bulk catalog ingestion |
| **Payment Service** | Spring Boot 3.3.4 | **8087** | `econext_payment_db` | Razorpay payment flow, HMAC verification, refunds |
| **Notification Service** | Spring Boot 3.3.4 | **8089** | `econext_notification_db`| Asynchronous email delivery & SMS notifications |
| **Customer Storefront** | React 19 / Vite 6 | **5173 / 5073** | None (Client) | Customer shopping portal, visual search, order tracking |
| **Admin Operations UI** | React 19 / Vite 6 | **5174 / 5074** | None (Client) | Logistics control room, fleet GPS maps, staff administration |
| **MySQL Database** | MySQL Server 8.0 | **3306** | Multi-Schema | Domain-isolated relational persistence |
| **Redis Cache** | Redis 7.2 Alpine | **6379** | Ephemeral | In-memory cache, rate limiting, and OTP PIN store |
| **Apache Kafka** | Confluent Kafka (KRaft) | **9092** | Event Logs | Distributed event streaming broker |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
* **Java 21 LTS** & **Maven 3.9+**
* **Python 3.11+** or **3.13** & `pip`
* **Node.js 18+** & `npm`
* **MySQL Server 8.0** & **Redis Server 7.x**

### 2. Infrastructure Setup (MySQL & Databases)
Initialize the MySQL databases defined in [`docker/init-databases.sql`](docker/init-databases.sql):
```sql
CREATE DATABASE IF NOT EXISTS `econext`;
CREATE DATABASE IF NOT EXISTS `econext_auth_db`;
CREATE DATABASE IF NOT EXISTS `econext_product_db`;
CREATE DATABASE IF NOT EXISTS `econext_cart_db`;
CREATE DATABASE IF NOT EXISTS `econext_order_db`;
CREATE DATABASE IF NOT EXISTS `econext_payment_db`;
CREATE DATABASE IF NOT EXISTS `econext_notification_db`;
CREATE DATABASE IF NOT EXISTS `econext_analytics_db`;
```

### 3. Backend Setup (Django Monolith)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### 4. Microservices Setup (Spring Boot)
Build and run the API Gateway and microservices using Maven:
```powershell
# In microservices/ directory:
mvn clean install -DskipTests

# Start the API Gateway (Port 8080):
cd api-gateway
mvn spring-boot:run

# In separate terminals, launch desired microservices (e.g. admin-staff-service on 8085):
cd ..\admin-staff-service
mvn spring-boot:run
```

### 5. Frontend Portals Setup
```powershell
# Customer Storefront (Port 5173 / 5073):
cd frontend
npm install
npm run dev

# Admin Operations Portal (Port 5174 / 5074):
cd ..\admin-frontend
npm install
npm run dev
```

---

## 🧪 Verification & Automated Test Suites

Run automated test suites across domains:
```powershell
# Django backend tests:
cd backend
python manage.py test

# Spring Boot microservice tests:
cd ..\microservices\order-operations-service
mvn test

# Frontend production builds:
cd ..\..\frontend
npm run build
cd ..\admin-frontend
npm run build
```

---

## 📄 License & Attribution

This project is licensed under the **MIT License**. Developed as a Capstone Engineering Project at JSPM's Jayawantrao Sawant College of Engineering.
