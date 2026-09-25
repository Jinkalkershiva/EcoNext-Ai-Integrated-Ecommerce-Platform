# EcoNext — AI-Powered E-Commerce & Microservices Platform

[![Java](https://img.shields.io/badge/Java-21%20LTS-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Spring Cloud](https://img.shields.io/badge/Spring%20Cloud-2023.0.3-green.svg)](https://spring.io/projects/spring-cloud)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.1-darkgreen.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)
[![Kafka](https://img.shields.io/badge/Apache%20Kafka-KRaft%20Mode-black.svg)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![Build Status](https://img.shields.io/badge/Build-Passing%20(32%2F32%20Tests)-success.svg)]()

EcoNext is an enterprise AI-assisted e-commerce platform engineered for personalized product discovery, multi-modal visual search, predictive "Buy or Wait" price forecasting, sustainability-aware recommendations, and an active, incremental phased migration from a Python Django monolith to a Spring Boot microservice architecture.

---

## Table of Contents
- [1. Project Overview](#1-project-overview)
- [2. Current Architecture](#2-current-architecture)
- [3. Migration Architecture (Strangler Fig Pattern)](#3-migration-architecture-strangler-fig-pattern)
- [4. Technology Stack](#4-technology-stack)
- [5. Repository Structure](#5-repository-structure)
- [6. Existing Django Backend Domains](#6-existing-django-backend-domains)
- [7. AI & Machine Learning Capabilities](#7-ai--machine-learning-capabilities)
- [8. Auth & User Service (`auth-service`)](#8-auth--user-service-auth-service)
- [9. Shopping Cart Service (`cart-service`)](#9-shopping-cart-service-cart-service)
- [10. Spring Cloud API Gateway (`api-gateway`)](#10-spring-cloud-api-gateway-api-gateway)
- [11. Database Architecture & Ownership](#11-database-architecture--ownership)
- [12. Authentication & Authorization Flow](#12-authentication--authorization-flow)
- [13. API Reference](#13-api-reference)
- [14. Local Development Setup](#14-local-development-setup)
- [15. Environment Variables](#15-environment-variables)
- [16. Verification & Testing](#16-verification--testing)
- [17. Docker & Infrastructure](#17-docker--infrastructure)
- [18. Security Architecture](#18-security-architecture)
- [19. Error Handling Specification](#19-error-handling-specification)
- [20. Migration Roadmap](#20-migration-roadmap)
- [21. Design Principles](#21-design-principles)
- [22. Known Limitations & Technical Debt](#22-known-limitations--technical-debt)
- [23. Current Development Status](#23-current-development-status)
- [24. Contribution & Development Workflow](#24-contribution--development-workflow)
- [25. License](#25-license)

---

## 1. Project Overview

EcoNext addresses the modern consumer dilemma in sustainable retail: finding authentic eco-friendly products while making informed purchasing decisions. The platform combines machine learning models (computer vision, price trend forecasting, semantic search, and generative AI) with an e-commerce transactional core.

### Key Capabilities
1. **Multi-Modal Visual Search**: Upload an image to find visually and semantically similar catalog products using OpenAI CLIP embeddings backed by FAISS vector indexing with color histogram fallback.
2. **"Buy or Wait" Price Forecasting**: 60-day historical pricing analyzed via Scikit-learn regression models to forecast 7-day price trajectories and provide confidence-scored purchasing advice.
3. **Intent-Driven Semantic Search**: TF-IDF and cosine similarity search engine that interprets natural language queries beyond simple keyword matches.
4. **Automated Ecological Taxonomy Tagger**: Multi-attribute classifier mapping items to age groups, gender segments, seasonal tags, and sustainability badges.
5. **Modern Architecture Migration**: Active strangler-fig migration replacing the legacy Django monolith with high-performance Spring Boot microservices while preserving 100% of the React frontend API contract.

---

## 2. Current Architecture

The platform operates in an incremental **Strangler Fig coexistence state**: identity routing and cart management run on standalone Spring Boot microservices, while catalog, orders, and AI inference run in the Django backend.

```
                             ┌────────────────────────┐
                             │ React 19 Frontend      │
                             │ (Port 3000 / 5173)     │
                             └───────────┬────────────┘
                                         │ HTTP REST / JSON
                                         ▼
                             ┌────────────────────────┐
                             │ Spring Cloud Gateway   │
                             │ (Port 8080)            │
                             └───┬──────────┬────────┬┘
                                 │          │        │
      Path: /api/auth/** (Order 1)│          │        │ Path: /api/** (Fallback Order 10000)
                                 │          │        │
                                 ▼          │        ▼
                  ┌──────────────────┐      │    ┌─────────────────────────┐
                  │  Auth Service    │      │    │  Django Monolith & AI   │
                  │  (Port 8081)     │      │    │  (Port 8000)            │
                  └────────┬─────────┘      │    └────────────┬────────────┘
                           │                │                 │
                           ▼                │                 ▼
                  ┌──────────────────┐      │    ┌─────────────────────────┐
                  │ econext_auth_db  │      │    │ econext (Django DB)     │
                  │ (MySQL 8.0:3306) │      │    │ (MySQL 8.0:3306)        │
                  └──────────────────┘      │    └─────────────────────────┘
                                            │                 │
                 Path: /api/cart/** (Order 3)│                 │
                                            ▼                 │
                             ┌──────────────────┐             │
                             │  Cart Service    │             │
                             │  (Port 8083)     │             │
                             └────────┬─────────┘             │
                                      │                       │
                                      ▼                       │
                             ┌──────────────────┐             │
                             │ econext_cart_db  │             │
                             │ (MySQL 8.0:3306) │             │
                             └──────────────────┘             │
                                                              │
                       ┌──────────────────────────────────────┼─────────────────┐
                       │                                      │                 │
                       ▼                                      ▼                 ▼
            ┌──────────────────────┐              ┌──────────────────┐  ┌─────────────┐
            │ CLIP + FAISS Index   │              │ Linear Regression│  │ Redis 7     │
            │ (Visual Search)      │              │ (Price Predictor)│  │ (Cache)     │
            └──────────────────────┘              └──────────────────┘  └─────────────┘
```

---

## 3. Migration Architecture (Strangler Fig Pattern)

The backend migration avoids a high-risk "big bang" rewrite by implementing the **Strangler Fig Pattern**:

```
[Phase 1: Gateway & Infra] (COMPLETED)
     └── Spring Cloud Gateway (:8080) with dynamic CORS and reverse proxying
[Phase 2: Identity & Auth] (COMPLETED)
     └── Spring Boot Auth Service (:8081) with MySQL (econext_auth_db) & JWT
[Phase 3: Shopping Cart] (COMPLETED)
     └── Spring Boot Cart Service (:8083) with MySQL (econext_cart_db) & stateless JWT
[Phase 4: Catalog & Products] (PLANNED)
     └── Product Service (:8082) with MySQL (econext_product_db)
[Phase 5: Orders & Checkout] (PLANNED)
     └── Order Service (:8084) with MySQL (econext_order_db) & Kafka events
[Phase 6: Personalization & Recommendations] (PLANNED)
     └── Personalization Service (:8086)
[Phase 7: Analytics & Telemetry] (PLANNED)
     └── Analytics Service (:8085) with Kafka stream consumers
[Phase 8: Python AI Microservice] (PLANNED)
     └── Encapsulation of CLIP, FAISS, and LLM Copilot in django-ai-service (:8000)
```

---

## 4. Technology Stack

| Layer / Domain | Technology | Version | Purpose in Repository |
| :--- | :--- | :--- | :--- |
| **API Gateway** | Spring Cloud Gateway (Netty) | 2023.0.3 | Central edge routing, CORS enforcement, and fallback proxying |
| **Auth Microservice** | Spring Boot, Spring Security | 3.3.4 | Stateless JWT auth, user registration, profile management |
| **Cart Microservice** | Spring Boot, Spring Data JPA | 3.3.4 | Shopping cart lifecycle, subtotal calculation, item mutations |
| **Java Platform** | OpenJDK | 21 LTS | Runtime for Spring Boot microservices |
| **Monolith Backend** | Django / Django REST Framework | 5.1 / 3.15 | Legacy catalog, order fulfillment, ML/AI engine |
| **Frontend** | React, React Router | 19.x | Single-page application user interface |
| **Relational Database**| MySQL Community Server | 8.0.x | Dedicated schema per bounded context (`econext_auth_db`, `econext_cart_db`, `econext`) |
| **Event Streaming** | Apache Kafka (KRaft mode) | 7.6.0 | Distributed event streaming for asynchronous domain telemetry |
| **In-Memory Cache** | Redis | 7.x | Caching price predictions, session tokens, and TF-IDF index |
| **Computer Vision** | OpenAI CLIP (`clip-ViT-B-32`) | — | Deep visual feature extraction for multi-modal search |
| **Vector Search** | FAISS (Facebook AI Similarity) | — | Indexing and cosine/L2 nearest neighbor vector retrieval |
| **Machine Learning** | Scikit-learn, NumPy | 1.5+ | 7-day linear price forecasting & TF-IDF intent processing |
| **Generative AI** | Google Gemini / OpenAI Models | — | Conversational shopping copilot |
| **Build & Tooling** | Apache Maven, pip, npm | 3.9+ | Multi-module build management and dependency resolution |

---

## 5. Repository Structure

```
EcoNext/
├── backend/                             # Django 5.1 Monolith & AI Engine
│   ├── accounts/                        # Django auth & user profile (legacy)
│   ├── copilot/                         # AI shopping chatbot services
│   ├── econext/                         # Django project settings & URL router
│   ├── kids_products/                   # Specialized catalog segment
│   ├── ml_engine/                       # Machine learning models & pipelines
│   │   ├── auto_tagger.py               # Taxonomy tagger
│   │   ├── clip_faiss.index             # Pre-built FAISS vector index
│   │   ├── price_predictor.py           # Linear regression price forecaster
│   │   └── visual_search.py             # CLIP + FAISS visual search
│   ├── order_service/                   # Orders and fulfillment
│   ├── personalization/                 # Recommendation logic
│   ├── products/                        # Product catalog & pricing models
│   ├── shop_cart/                       # Shopping cart management (legacy)
│   ├── site_analytics/                  # Platform metrics tracking
│   ├── manage.py                        # Django CLI entry point
│   ├── requirements.txt                 # Python dependencies
│   └── .env.example                     # Django environment template
├── microservices/                       # Spring Boot Multi-Module Ecosystem
│   ├── pom.xml                          # Parent POM (Java 21, Spring Boot 3.3.4)
│   ├── docker-compose.yml               # MySQL 8.0, Redis 7, Kafka KRaft, Kafka UI
│   ├── .env.example                     # Microservices environment template
│   ├── docker/
│   │   └── init-databases.sql           # MySQL database schema provisioning
│   ├── api-gateway/                     # Spring Cloud Gateway (Port 8080)
│   │   ├── pom.xml
│   │   └── src/main/java/com/econext/gateway/
│   ├── auth-service/                    # Spring Boot Auth Service (Port 8081)
│   │   ├── pom.xml
│   │   └── src/main/java/com/econext/auth/
│   └── cart-service/                    # Spring Boot Cart Service (Port 8083)
│       ├── pom.xml
│       └── src/main/java/com/econext/cart/
├── docs/                                # System & service documentation
│   ├── AUTH_SERVICE.md
│   ├── CART_SERVICE.md
│   ├── CURRENT_API_CATALOG.md
│   └── STEP1_GUIDE.md
├── .gitignore                           # Consolidated root Git ignore
└── README.md                            # Comprehensive platform documentation
```

---

## 6. Existing Django Backend Domains

The Django monolith contains 9 modular domain apps:

1. **`accounts`**: User models, `UserProfile`, and `ActivityLog` tracking.
2. **`products`**: `Product`, `Category`, `PriceHistory`, `EcoTag`, `AgeGroup`, `GenderCategory`, and `Season` models.
3. **`ml_engine`**: Visual search pipeline (CLIP/FAISS), price prediction models, and intent search.
4. **`copilot`**: Natural language shopping assistant integrating LLM APIs.
5. **`personalization`**: Preference-based scoring and recommendation heuristics.
6. **`kids_products`**: Segmented catalog for children's sustainable clothing and accessories.
7. **`shop_cart`**: Shopping cart, cart item persistence, and subtotal calculation (co-existing during migration).
8. **`order_service`**: Order creation, address management, and status updates.
9. **`site_analytics`**: Daily engagement metrics and trending product calculations.

---

## 7. AI & Machine Learning Capabilities

### 7.1 "Buy or Wait" Price Predictor
* **Problem**: Customers experience uncertainty about price volatility and potential discounts.
* **Approach**: Trains a Scikit-learn `LinearRegression` model dynamically on 60 days of historical `PriceHistory` entries.
* **Algorithm**: Projects price slopes over days $t+1 \dots t+7$. Computes trend direction and confidence score:
  * $\Delta > +5\% \rightarrow$ `best_price` (Buy Now, price rising)
  * $\Delta < -5\% \rightarrow$ `wait` (Wait, price falling)
  * Otherwise $\rightarrow$ `neutral`
* **API**: `GET /api/products/{id}/prediction/`

### 7.2 Multi-Modal Visual Search
* **Problem**: Finding clothing or home items when text descriptions are inadequate.
* **Approach**: Uses OpenAI CLIP (`ViT-B/32`) deep convolutional image embeddings mapped into a 512-dimensional vector space.
* **Vector Indexing**: Indexed via Facebook AI Similarity Search (FAISS) using Euclidean L2 distance with normalized vectors (cosine similarity).
* **Fallback**: When neural models are unavailable, falls back to a 3D HSV color histogram correlation algorithm.
* **API**: `POST /api/products/search/visual/`

### 7.3 Intent-Based Semantic Search
* **Problem**: Traditional SQL keyword matching misses context (e.g. "warm winter coat for kids").
* **Approach**: Scikit-learn TF-IDF Vectorizer coupled with Cosine Similarity across combined product titles, descriptions, and tags.
* **API**: `GET /api/products/search/intent/?q={query}`

### 7.4 Auto-Tagger Taxonomy Classifier
* **Problem**: Manual tagging of incoming product listings is error-prone.
* **Approach**: Natural language taxonomy classifier extracting age group, gender, style, season, and sustainability attributes.
* **CLI**: `python manage.py run_autotagger`

### 7.5 AI Copilot Shopping Assistant
* **Problem**: Assisting shoppers with style questions, sizing, and product recommendations.
* **Approach**: Context-aware chatbot integrating LLMs with catalog grounding.
* **API**: `POST /api/copilot/chat/` and `POST /api/chat/`

---

## 8. Auth & User Service (`auth-service`)

The **Auth Service** is the identity authority for the EcoNext platform.

* **Port**: `8081`
* **Database**: `econext_auth_db` on MySQL 8.0
* **Security Framework**: Spring Security 6 + JJWT (`0.12.6`)
* **Password Hashing**: BCrypt (`BCryptPasswordEncoder`, strength 10)
* **Tokens**:
  * **Access Token**: HMAC-SHA256 (24-hour expiration)
  * **Refresh Token**: HMAC-SHA256 (7-day expiration)

### Endpoints
| HTTP Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup/` | Public | Register new user account with BCrypt password hashing |
| `POST` | `/api/auth/login/` | Public | Authenticate credentials and receive access/refresh tokens |
| `POST` | `/api/auth/refresh/` | Public | Exchange valid refresh token for a new access token |
| `POST` | `/api/auth/logout/` | Bearer | Inform client to discard tokens (client-side discard semantics) |
| `GET` | `/api/auth/current-user/` | Bearer | Retrieve authenticated user profile and preference metadata |
| `PUT` | `/api/auth/profile/update/` | Bearer | Update user contact info, address, and profile settings |

---

## 9. Shopping Cart Service (`cart-service`)

The **Cart Service** manages customer shopping carts, item quantities, and price aggregations.

* **Port**: `8083`
* **Database**: `econext_cart_db` on MySQL 8.0
* **Security**: Stateless HMAC-SHA256 JWT claim verification (`user_id`, `username`, `role`)
* **Persistence**: `Cart` and `CartItem` entities mapped via Spring Data JPA

### Endpoints
| HTTP Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart/` | Bearer | Get customer's current shopping cart and active line items |
| `POST` | `/api/cart/add/` | Bearer | Add product to cart or increment quantity |
| `PUT / PATCH` | `/api/cart/item/{id}/` | Bearer | Update quantity (setting quantity to 0 removes line item) |
| `DELETE` | `/api/cart/item/{id}/` or `/delete/`| Bearer | Remove single line item from cart |
| `POST / DELETE` | `/api/cart/clear/` | Bearer | Remove all line items from cart |

---

## 10. Spring Cloud API Gateway (`api-gateway`)

The **API Gateway** serves as the single unified entry point on port `8080`.

### Gateway Route Precedence
| Priority (Order) | Route ID | Path Predicate | Target Service | Status |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `auth-service-route` | `/api/auth/**` | `http://localhost:8081` | **Migrated (Spring)** |
| **2** | `product-service-route` | `/api/products/**`, `/api/categories/**`, `/api/kids/**` | `http://localhost:8082` | Target (Phase 4) |
| **3** | `cart-service-route` | `/api/cart/**` | `http://localhost:8083` | **Migrated (Spring)** |
| **4** | `order-service-route` | `/api/orders/**` | `http://localhost:8084` | Target (Phase 5) |
| **5** | `personalization-service-route` | `/api/personalization/**` | `http://localhost:8086` | Target (Phase 6) |
| **6** | `ai-copilot-route` | `/api/copilot/**`, `/api/chat/**` | `http://localhost:8000` | **Active (Django AI)** |
| **10000** | `django-fallback-route` | `/api/**` | `http://localhost:8000` | **Active (Catch-All Fallback)** |

---

## 11. Database Architecture & Ownership

Each microservice strictly owns its dedicated relational database in accordance with the **Database-per-Service** pattern.

```
                                  MySQL 8.0 Server (:3306)
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             ▼                               ▼                               ▼
     [ econext_auth_db ]             [ econext_cart_db ]             [ econext (Django) ]
      Owned by Auth Service           Owned by Cart Service           Owned by Django Monolith
      - users                         - carts                         - legacy catalog
      - user_profiles                 - cart_items                    - orders
      - user_preferences                                              - analytics
```

* **Storage Engine**: InnoDB
* **Character Set**: `utf8mb4`
* **Collation**: `utf8mb4_unicode_ci`

---

## 12. Authentication & Authorization Flow

### 12.1 User Registration Flow
```
React Client                 API Gateway (:8080)          Auth Service (:8081)           MySQL Database
     │                                │                            │                           │
     │── POST /api/auth/signup/ ─────▶│── Route to :8081 ─────────▶│                           │
     │   {username, email, password}  │                            │── Check user exists ─────▶│
     │                                │                            │◀── User not found ────────│
     │                                │                            │── Hash password (BCrypt)  │
     │                                │                            │── Insert user & profile ─▶│
     │                                │                            │── Generate JWT pair       │
     │◀── 201 Created (User + JWTs) ──│◀── 201 Created ────────────│                           │
```

### 12.2 Cart Request Flow (Stateless Zero-Trust)
```
React Client                 API Gateway (:8080)          Cart Service (:8083)           MySQL (econext_cart_db)
     │                                │                            │                               │
     │── GET /api/cart/ ─────────────▶│── Route to :8083 ─────────▶│                               │
     │   Header: Bearer <JWT>         │                            │── Validate JWT signature      │
     │                                │                            │   (Extracts userId from token)│
     │                                │                            │── Query cart for userId ─────▶│
     │                                │                            │◀── Cart & Line items ─────────│
     │◀── 200 OK (Cart Payload) ──────│◀── 200 OK ─────────────────│                               │
```

---

## 13. API Reference

### 13.1 Register New User
```bash
curl -X POST http://localhost:8080/api/auth/signup/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "johndoe@example.com",
    "password": "SecurePassword123!",
    "password_confirm": "SecurePassword123!",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### 13.2 Add Item to Cart
```bash
curl -X POST http://localhost:8080/api/cart/add/ \
  -H "Authorization: Bearer <JWT_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "product_name": "Organic Bamboo Toothbrush",
    "unit_price": 12.99,
    "quantity": 2
  }'
```

---

## 14. Local Development Setup

### Prerequisites
* **Java**: OpenJDK 21 LTS (`java -version`)
* **Maven**: Apache Maven 3.9+ (`mvn -version`)
* **Python**: Python 3.11+ with virtual environment tools (`python --version`)
* **Node.js**: Node.js 18+ and npm (`node -v`)
* **MySQL Server**: Local MySQL 8.0 running on port `3306`
* **Docker Desktop**: (Optional) For Kafka & Redis containers

### 1. Start MySQL & Create Databases
```sql
CREATE DATABASE IF NOT EXISTS econext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS econext_auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS econext_cart_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Run Spring Boot Microservices
```bash
# Terminal 1: API Gateway
cd microservices/api-gateway
mvn spring-boot:run

# Terminal 2: Auth Service
cd microservices/auth-service
mvn spring-boot:run

# Terminal 3: Cart Service
cd microservices/cart-service
mvn spring-boot:run
```

### 3. Run Django Monolith
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

---

## 15. Environment Variables

### Microservices Configuration (`microservices/.env.example`)
```env
# Server Ports
GATEWAY_PORT=8080
AUTH_SERVICE_PORT=8081
CART_SERVICE_PORT=8083

# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
AUTH_DB_NAME=econext_auth_db
CART_DB_NAME=econext_cart_db

# Security
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
```

---

## 16. Verification & Testing

Execute the multi-module test suite across all active microservices:

```bash
cd microservices
mvn clean test
```

### Test Suite Execution Output
```
[INFO] Reactor Summary for EcoNext Microservices Parent 1.0.0-SNAPSHOT:
[INFO] EcoNext Microservices Parent ....................... SUCCESS
[INFO] EcoNext API Gateway ................................ SUCCESS (8 tests, 0 failures, 0 errors)
[INFO] EcoNext Auth & User Service ........................ SUCCESS (12 tests, 0 failures, 0 errors)
[INFO] EcoNext Cart Service ............................... SUCCESS (12 tests, 0 failures, 0 errors)
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS (Total: 32 tests, 0 failures, 0 errors, 0 skipped)
```

---

## 17. Docker & Infrastructure

The `microservices/docker-compose.yml` provides pre-configured infrastructure:

```bash
cd microservices
docker compose up -d
```

### Services Provisioned
* **`mysql`**: MySQL 8.0 on port `3306` with automatic database provisioning.
* **`redis`**: Redis 7.0 on port `6379` for caching and session state.
* **`kafka`**: Apache Kafka 7.6.0 in KRaft mode (no ZooKeeper dependency) on port `9092`.
* **`kafka-ui`**: Web management UI for Kafka topics on port `8088`.

---

## 18. Security Architecture

1. **Zero-Trust Token Validation**: Each microservice verifies JWT signatures independently using a shared cryptographic key, preventing header-spoofing vulnerabilities.
2. **Password Hashing**: BCrypt with salt rounds configured to prevent brute-force attacks.
3. **Secrets Hygiene**: Credentials and keys are injected via environment variables; `.gitignore` prevents secrets leakage to version control.
4. **Input Sanitization**: Jakarta Bean Validation (`@Valid`, `@NotBlank`, `@Email`, `@Size`) enforces input structure before reaching domain logic.
5. **CORS Hardening**: Strict origin whitelisting in Spring Cloud Gateway.

---

## 19. Error Handling Specification

All Spring microservices return uniform, RFC-compliant error envelopes:

```json
{
  "timestamp": "2026-09-26T04:15:05.028",
  "status": 401,
  "error": "UNAUTHORIZED",
  "message": "Authentication token is missing or invalid",
  "path": "/api/cart/"
}
```

Validation failures return structured field errors:
```json
{
  "timestamp": "2026-09-26T04:13:00.519",
  "status": 400,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed for /api/cart/add/",
  "validation_errors": {
    "productId": "Product ID is required",
    "quantity": "Quantity must be at least 1"
  },
  "path": "/api/cart/add/"
}
```

---

## 20. Migration Roadmap

| Domain / App | Monolith State | Target Microservice | Migration Status |
| :--- | :--- | :--- | :--- |
| **API Gateway** | N/A | `api-gateway` (Port 8080) | **Completed** |
| **Authentication & Users** | Django `accounts` | `auth-service` (Port 8081) | **Completed** |
| **Shopping Cart** | Django `shop_cart` | `cart-service` (Port 8083) | **Completed** |
| **Product Catalog & Taxonomies** | Django `products`, `kids_products` | `product-service` (Port 8082) | *Planned (Phase 4)* |
| **Orders & Checkout** | Django `order_service` | `order-service` (Port 8084) | *Planned (Phase 5)* |
| **Personalization Engine** | Django `personalization` | `personalization-service` (Port 8086) | *Planned (Phase 6)* |
| **Analytics & Event Telemetry**| Django `site_analytics` | `analytics-service` (Port 8085) | *Planned (Phase 7)* |
| **AI / ML & Copilot Service** | Django `ml_engine`, `copilot` | `django-ai-service` (Port 8000) | *Planned (Phase 8)* |

---

## 21. Design Principles

* **Strict Database Ownership**: No microservice accesses tables owned by another microservice. Cross-domain data is retrieved via REST or event streams.
* **Synchronous REST vs Asynchronous Kafka**: Direct user interactions (checkout, authentication) use HTTP REST; telemetry, audit logging, and recommendations use Kafka event streams.
* **Backward Compatibility**: Migration must never require modifying the React frontend API contracts.
* **Statelessness**: Microservices maintain no in-memory session state, allowing horizontal scaling behind the API Gateway.

---

## 22. Known Limitations & Technical Debt

1. **Client-Side Token Discard on Logout**: JWT logout currently relies on client-side token deletion. A Redis revocation blacklist will be introduced in the Security Hardening phase.
2. **Historical ActivityLog**: Historical analytics in Django `accounts_activitylog` will be migrated to `econext_analytics_db` during Step 7.
3. **Coexistence Redundancy**: During migration, Django and Spring services both access local MySQL; Django code is preserved until integration testing is complete.

---

## 23. Current Development Status

* **Completed**: 
  - Step 1: Multi-Module Maven, Gateway, Infrastructure
  - Step 2: Auth Service Migration, MySQL integration, live verification
  - Step 3: Cart Service Microservice implementation, MySQL integration, and Gateway routing
* **Next Up**: Product Catalog, Taxonomies, and Kids Product domain migration to `product-service` on port 8082.

---

## 24. Contribution & Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/product-service-migration
   ```
2. Implement domain changes following the layered architecture (`controller` $\rightarrow$ `service` $\rightarrow$ `repository` $\rightarrow$ `model`).
3. Execute unit and integration tests:
   ```bash
   mvn test
   ```
4. Verify Git diff and submit a Pull Request:
   ```bash
   git status
   git diff --stat
   ```

---

## 25. License

Licensing has not yet been specified for this project.
