# EcoNext — AI-Integrated E-Commerce, Spring Boot Microservices & Big Data Platform

[![Java](https://img.shields.io/badge/Java-21%20LTS-orange.svg?logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Cloud](https://img.shields.io/badge/Spring%20Cloud-2023.0.3-green.svg)](https://spring.io/projects/spring-cloud)
[![Python](https://img.shields.io/badge/Python-3.11%2B%20%2F%203.13-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.1.6-darkgreen.svg?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Django REST Framework](https://img.shields.io/badge/DRF-3.15-red.svg)](https://www.django-rest-framework.org/)
[![React 19](https://img.shields.io/badge/React-19.2.3-cyan.svg?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4.3-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7%20Alpine-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-3.7%20KRaft-black.svg?logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![Apache Spark](https://img.shields.io/badge/Apache%20Spark-3.5%20Structured%20Streaming-E25A1C.svg?logo=apachespark&logoColor=white)](https://spark.apache.org/)
[![Apache Hadoop](https://img.shields.io/badge/Apache%20Hadoop-HDFS%20Data%20Lake-66CCFF.svg?logo=apachehadoop&logoColor=white)](https://hadoop.apache.org/)
[![Razorpay](https://img.shields.io/badge/Razorpay-HMAC--SHA256%20Verified-blue.svg)](https://razorpay.com/)
[![Build Status](https://img.shields.io/badge/Build-Passing%20(100%25%20Verified)-success.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Project Overview & Context

**EcoNext** is an enterprise-grade, sustainable AI-integrated retail platform and distributed e-commerce ecosystem developed as a **Final-Year Group Capstone Project**.

The platform combines multi-modal artificial intelligence (computer vision similarity search, predictive price forecasting, TF-IDF natural language intent search, and LLM-grounded conversational commerce) with a high-throughput **Java 21 / Spring Boot 3.3.4 microservices architecture**, a reactive **Spring Cloud API Gateway**, a dedicated **React 19 Admin & Staff Operations Portal**, a secure **Razorpay Online Payment Gateway**, and an event-driven **Big Data streaming & Hadoop HDFS Data Lake** ingestion layer.

### 👥 Capstone Project Team Members
* **Shiva Jinkalker** ([GitHub: @Jinkalkershiva](https://github.com/Jinkalkershiva))
* **RajputAtul75** ([GitHub: @RajputAtul75](https://github.com/RajputAtul75))

---

## 📑 Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Project Objectives & Scope](#2-project-objectives--scope)
3. [System Design & Architectural Blueprint](#3-system-design--architectural-blueprint)
4. [Technology Stack Matrix](#4-technology-stack-matrix)
5. [Comprehensive Data Flow Diagrams (DFD)](#5-comprehensive-data-flow-diagrams-dfd)
6. [Detailed Sequence Diagrams](#6-detailed-sequence-diagrams)
7. [Database Management System (DBMS) & Entity-Relationship (ER) Design](#7-database-management-system-dbms--entity-relationship-er-design)
8. [Core Microservices & Bounded Contexts](#8-core-microservices--bounded-contexts)
9. [Razorpay Payment Gateway & Cryptographic Integrity](#9-razorpay-payment-gateway--cryptographic-integrity)
10. [AI & Machine Learning Engineering](#10-ai--machine-learning-engineering)
11. [Big Data Streaming, Real-Time Fulfillment & Hadoop Data Lake](#11-big-data-streaming-real-time-fulfillment--hadoop-data-lake)
12. [Admin & Staff Operational Governance (RBAC/PBAC)](#12-admin--staff-operational-governance-rbacpbac)
13. [Customer Storefront Experience](#13-customer-storefront-experience)
14. [API Route Matrix & Gateway Ingress Mapping](#14-api-route-matrix--gateway-ingress-mapping)
15. [Group Contributions & Git Engineering History](#15-group-contributions--git-engineering-history)
16. [Local Development Setup Guide](#16-local-development-setup-guide)
17. [Verification, Quality Assurance & Test Suites](#17-verification-quality-assurance--test-suites)
18. [Planned Enhancements & Future Scope](#18-planned-enhancements--future-scope)
19. [License & Acknowledgments](#19-license--acknowledgments)

---

## 1. Executive Summary & Problem Statement

### 1.1 The Real-World Problem
Traditional e-commerce platforms suffer from critical structural, architectural, and usability bottlenecks:
1. **Rigid Keyword-Based Search**: Customers often search with lifestyle intents (e.g., *"beach vacation"*, *"home office setup"*, *"marathon training"*) rather than exact SKU names. Traditional exact-match SQL search fails on semantic phrasing.
2. **Visual Discovery Barrier**: Users frequently have a photo or screenshot of a product they admire but lack the vocabulary to describe it textually.
3. **Price Volatility & Buyer Hesitation**: E-commerce prices fluctuate dynamically. Shoppers experience hesitation and buyer remorse, wondering whether to purchase immediately or wait for an impending price drop.
4. **Lack of Sustainability Visibility**: Modern eco-conscious consumers struggle to identify environmentally responsible products, organic materials, and carbon-conscious supply chains due to greenwashing and missing standardized sustainability metrics.
5. **Premature Payment & Order State Inconsistencies**: Flawed checkout gateways create unconfirmed orders before online payment capture, leaving pending ghost orders and depleted stock when customers abandon payment modals.
6. **Monolithic Bottlenecks & Operational Opacity**: Tightly coupled monoliths present single points of failure, lack granular role-based operational security for administrative staff, and obscure the multi-stage lifecycle of order fulfillment.
7. **Telemetry & Clickstream Data Silos**: Customer behavior, search drop-offs, and conversion analytics are often lost or siloed in relational databases rather than ingested in real time into analytical data lakes for predictive intelligence.

### 1.2 How EcoNext Addresses the Problem

| Identified Problem | EcoNext Technical Solution |
| :--- | :--- |
| **Semantic Search Friction** | TF-IDF vector space semantic matching with cosine similarity |
| **Image-Based Product Discovery** | Multi-Modal Visual Search (OpenAI CLIP ViT + 3D HSV Fallback) |
| **Dynamic Price Uncertainty** | Scikit-learn Linear Regression "Buy or Wait" 7-day predictor |
| **Sustainable Retail Transparency** | Quantitative Sustainability Scores & EcoTag filtering |
| **Conversational Shopping Assistance** | Context-Grounded Google Gemini AI Copilot (Zero hallucinations) |
| **Premature Checkout Order Bug** | Cryptographic HMAC-SHA256 Razorpay verification + zero ghost orders |
| **Scalability & Domain Isolation** | Java 21 Spring Boot Microservices + Spring Cloud Gateway |
| **Admin & Staff Authority** | Spring Boot `admin-staff-service` Single Source of Truth (SSOT) |
| **Real-Time GPS Logistics** | Physical `Shipment` domain model + Kafka streaming + STOMP `/ws-tracking` |
| **Staff Governance & Auditing** | Granular 8-Role RBAC/PBAC Admin Portal with forensic audit logging |
| **Real-Time Big Data Telemetry** | Apache Kafka KRaft + PySpark Streaming + Hadoop HDFS Data Lake |

---

## 2. Project Objectives & Scope

The primary engineering objectives of this final-year capstone project are:
* **Deliver Intelligent Product Discovery**: Implement multi-modal AI search allowing customers to query using images (CLIP ViT-B/32 & color histograms) or natural language intents (TF-IDF vectorizer).
* **Provide Algorithmic Shopping Intelligence**: Build an interpretable 60-day historical price forecasting engine projecting 7-day price trajectories with explicit "Buy Now" or "Wait" recommendation confidence scores.
* **Integrate Guardrailed Generative AI**: Deploy a context-grounded shopping chatbot assistant using Google Gemini, grounded strictly on real database inventory to eliminate hallucinations.
* **Guarantee Payment & Fulfillment Integrity**: Implement a secure Razorpay online payment flow with server-side amount calculation, cryptographic HMAC-SHA256 signature verification, and zero ghost-order creation.
* **Architect a Scalable Microservices Ecosystem**: Decouple business domains into independent Spring Boot microservices with Spring Cloud Gateway routing, stateless JWT security, and domain-owned MySQL database clusters.
* **Consolidate Admin/Staff Authority**: Establish Spring Boot `admin-staff-service` via API Gateway as the authoritative Single Source of Truth for administrative governance and 8 operational staff roles.
* **Real-Time Logistics Tracking**: Implement a physical `Shipment` domain hierarchy with vehicle GPS telemetry streamed over Kafka and broadcast to clients via WebSocket STOMP.
* **Construct a Big Data Streaming Pipeline**: Stream real-time telemetry (searches, impressions, cart events, orders) through Apache Kafka KRaft brokers into an Apache Hadoop HDFS Data Lake via PySpark Structured Streaming.

---

## 3. System Design & Architectural Blueprint

### 3.1 High-Level Distributed Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer["Client & UI Layer"]
        CustomerStore["Customer Storefront<br/>(React 19 / Vite - Port 5073)"]
        AdminPortal["Admin & Staff Portal<br/>(React 19 / Vite - Port 5074)"]
    end

    subgraph EdgeLayer["Edge Ingress & API Gateway"]
        Gateway["Spring Cloud Gateway<br/>(Reactive Netty - Port 8080)"]
    end

    subgraph MicroservicesLayer["Java 21 Spring Boot 3.3.4 Microservices"]
        AdminStaffService["Admin & Staff Core (SSOT)<br/>(:8085)"]
        OrderOpsService["Order Fulfillment & GPS Ops<br/>(:8084)"]
        CatalogOpsService["Catalog & Inventory Ops<br/>(:8082)"]
        AuthService["Auth & User Service<br/>(:8081)"]
        CartService["Shopping Cart Service<br/>(:8083)"]
        ImportAnalysisService["Data Import & Analytics<br/>(:8086)"]
        PaymentService["Payment Service (Razorpay)<br/>(:8087)"]
        NotificationService["Notification Service<br/>(:8089)"]
    end

    subgraph PythonLayer["Python Django & AI Engine (Port 8000)"]
        DjangoCore["Django REST Framework Core (Customer Store)"]
        PaymentVerifier["Razorpay HMAC-SHA256 Verifier"]
        VisualSearchEngine["CLIP ViT / HSV Color Search"]
        PricePredictor["Linear Regression Price Forecaster"]
        IntentSearch["TF-IDF Intent Search"]
        GeminiCopilot["Google Gemini AI Assistant"]
    end

    subgraph PersistenceLayer["Databases & In-Memory Caches"]
        MySQLCluster[("MySQL 8.0 Cluster<br/>(econext_auth_db, econext_order_db, etc.)")]
        RedisCache[("Redis 7<br/>(Cache & OTP Store)")]
    end

    subgraph RealTimeLayer["Real-Time & Big Data Streaming"]
        KafkaBroker["Apache Kafka KRaft Broker<br/>(Port 9092)"]
        StompBroker["WebSocket / STOMP Server<br/>(/ws-tracking)"]
        SparkEngine["Spark Structured Streaming & Analytics"]
        HadoopHDFS[("Apache Hadoop HDFS Data Lake<br/>hdfs://localhost:9000/econext/")]
    end

    CustomerStore -->|HTTP / REST| DjangoCore
    CustomerStore -.->|STOMP Feeds| StompBroker
    AdminPortal -->|HTTP / JWT| Gateway
    AdminPortal -.->|STOMP Feeds| StompBroker

    Gateway -->|/api/admin/**, /api/staff/**| AdminStaffService
    Gateway -->|/api/order-ops/**| OrderOpsService
    Gateway -->|/api/catalog-ops/**, /api/inventory-ops/**| CatalogOpsService
    Gateway -->|/api/auth/**| AuthService
    Gateway -->|/api/cart/**| CartService
    Gateway -->|/api/payments/**| PaymentService
    Gateway -->|/api/import/**, /api/analytics/**| ImportAnalysisService
    Gateway -->|/api/notifications/**| NotificationService
    Gateway -->|/api/copilot/**, /api/products/**, /api/** (Fallback)| DjangoCore

    AdminStaffService --> MySQLCluster
    OrderOpsService --> MySQLCluster
    CatalogOpsService --> MySQLCluster
    AuthService --> MySQLCluster
    CartService --> MySQLCluster
    ImportAnalysisService --> MySQLCluster
    PaymentService --> MySQLCluster
    NotificationService --> MySQLCluster
    DjangoCore --> MySQLCluster
    DjangoCore --> RedisCache

    DjangoCore --> PaymentVerifier
    DjangoCore --> VisualSearchEngine
    DjangoCore --> PricePredictor
    DjangoCore --> IntentSearch
    DjangoCore --> GeminiCopilot

    OrderOpsService -.->|shipment.location.updated| KafkaBroker
    OrderOpsService -.->|shipment.status.updated| KafkaBroker
    DjangoCore -.->|Clickstream & Searches| KafkaBroker
    PaymentService -.->|Payment Events| KafkaBroker

    KafkaBroker --> OrderOpsService
    OrderOpsService --> StompBroker
    KafkaBroker --> NotificationService
    KafkaBroker --> SparkEngine
    SparkEngine --> HadoopHDFS
```

### 3.2 Architectural Principles & Patterns
1. **Single Source of Truth (SSOT) Pattern**: Spring Boot `admin-staff-service` via API Gateway (`:8080`) is the authoritative identity and RBAC backend for all Administrative and Operational staff.
2. **Database-per-Service Pattern**: Each microservice manages its dedicated schema within MySQL 8.0 to enforce strict bounded contexts (`econext_auth_db`, `econext_order_db`, etc.).
3. **Physical Shipment Domain Modeling**: Order fulfillment strictly separates commercial transactions (`Order`) from physical vehicle movements (`Shipment`), enabling real-time GPS tracking.
4. **Event-Driven Choreography & WebSocket Streaming**: Logistics GPS pings and state updates publish to Apache Kafka KRaft topics, which are fanned out to clients via STOMP WebSocket (`/ws-tracking`).
5. **Zero Trust & Defense in Depth**: Stateless JWT authentication with embedded granular permission claims and constant-time cryptographic hash verification.

---

## 4. Technology Stack Matrix

| Layer | Technology | Purpose & Description |
| :--- | :--- | :--- |
| **Customer Frontend** | React 19.2.3, Vite 6.4.3 | High-performance SPA (Port `5073`) with 3-theme system, Framer Motion animations, and visual search modal. |
| **Admin Frontend** | React 19, Vite, Lucide Icons, Leaflet | Dedicated operational portal (Port `5074`) with live OpenStreetMap GPS tracking, Theme Lamp, and role dashboards. |
| **Edge API Gateway** | Spring Cloud Gateway (Netty) | Reactive edge reverse proxy (Port `8080`) providing routing, CORS management, and fallback bridging. |
| **Admin/Staff Authority** | Spring Boot 3.3.4, Java 21 LTS | Single Source of Truth (`admin-staff-service`, Port `8085`) for Admin & 8 operational staff roles. |
| **Fulfillment & Logistics** | Spring Boot 3.3.4, STOMP | Physical `Shipment` domain engine (`order-operations-service`, Port `8084`) with `/ws-tracking` WebSocket. |
| **Customer Monolith & AI** | Python 3.11+ / 3.13, Django 5.1.6 | DRF 3.15 (Port `8000`), customer commerce, ML model hosting, and Razorpay signature verification. |
| **Relational Database** | MySQL 8.0 (Community Server) | Domain-isolated schemas (`econext`, `econext_auth_db`, `econext_order_db`, `econext_payment_db`, etc.). |
| **Dev Database Fallback** | SQLite 3 | Zero-configuration local development persistence fallback for Django customer commerce. |
| **In-Memory Cache & OTP** | Redis 7 (Alpine) | Distributed TTL cache, rate limiting, and OTP password-reset verification store. |
| **Payment Gateway** | Razorpay SDK & Webhooks | Server-side order creation, HMAC-SHA256 signature verification, and zero ghost orders. |
| **Visual Search AI** | OpenAI CLIP (`ViT-B/32`) & FAISS | 512-dimensional vector embedding visual similarity retrieval with 3D HSV color histogram fallback. |
| **Predictive AI** | Scikit-learn (Linear Regression) | 60-day historical time-series price trajectory predictor outputting 7-day forecasts and buy/wait advice. |
| **Intent Search NLP** | Scikit-learn (TF-IDF Vectorizer) | Natural language lifestyle query transformation and cosine similarity catalog retrieval. |
| **Conversational AI** | Google Gemini (via AI bridge) | Context-aware shopping assistant grounded with real database candidate products. |
| **Event Broker** | Apache Kafka 3.7 (KRaft Mode) | Distributed event streaming broker operating without ZooKeeper across high-throughput topics. |
| **Stream Processing** | Apache Spark 3.5 (PySpark) | Structured Streaming pipeline reading Kafka topics and checkpointing partitioned Parquet to HDFS. |
| **Distributed Data Lake** | Apache Hadoop 3.x (HDFS) | Multi-tier analytical storage lake (`/econext/raw/`, `/econext/processed/`, `/econext/analytics/`). |
| **Data Ingestion** | Apache POI 5.3, OpenCSV 5.9 | High-performance batch parser for Excel (`.xlsx`, `.xls`) and CSV product catalog uploads. |
| **Authentication** | JJWT 0.12.6 / SimpleJWT | Stateless HMAC-SHA256 JWT access and refresh token security with BCrypt password hashing. |
| **Containerization** | Docker & Docker Compose | Containerized infrastructure for MySQL 8, Redis 7, Kafka KRaft, and Kafka-UI. |

---

## 5. Comprehensive Data Flow Diagrams (DFD)

### 5.1 Level 0: Context Data Flow Diagram

```mermaid
flowchart LR
    Customer([Customer / Shopper])
    Staff([Admin & Operations Staff])
    PaymentGateway([Razorpay Payment Gateway])
    KafkaBroker([Apache Kafka KRaft])
    DataLake([Hadoop HDFS Data Lake])

    subgraph EcoNextPlatform["EcoNext Enterprise Platform"]
        GatewayCore["Spring Cloud Gateway (:8080)<br/>& Microservices Ecosystem"]
        AIEngine["AI / ML Analytics Engine (:8000)"]
        Database[("MySQL 8.0 Cluster")]
    end

    Customer -->|Searches, Orders, Carts, Payments| GatewayCore
    GatewayCore -->|Catalog, Order Confirmations, Receipts| Customer

    Staff -->|Catalog Updates, GPS Pings, Provisioning| GatewayCore
    GatewayCore -->|Metrics, Live Dashboards, Live GPS Maps| Staff

    GatewayCore <-->|Order Tokens, Signatures, Webhooks| PaymentGateway
    GatewayCore <-->|Candidate Grounding, Forecasts, Visual Embeddings| AIEngine
    GatewayCore <-->|ACID Transactions, Read/Write Ledgers| Database

    GatewayCore -->|Clickstream, GPS Updates, Orders| KafkaBroker
    KafkaBroker -->|Structured Parquet Streaming| DataLake
```

### 5.2 Level 1: End-to-End E-Commerce, Logistics & Big Data Pipeline Flow

```mermaid
flowchart TD
    subgraph Ingress["1. Ingress & Traffic Routing"]
        A[Customer Browser :5073] -->|HTTP Request| Django[Django Core :8000]
        Admin[Admin Portal :5074] -->|HTTP Request| B[API Gateway :8080]
    end

    subgraph AuthPipeline["2. Admin & Staff Authority (SSOT)"]
        B -->|/api/admin/**, /api/staff/**| C[Admin Staff Service :8085]
        C -->|Validate & Sign| D[(econext_auth_db)]
        C -->|Issue Role JWT| Admin
    end

    subgraph DiscoveryPipeline["3. AI Product Discovery & Catalog"]
        Django -->|Visual Search| F[CLIP ViT / HSV Index]
        Django -->|Price Forecast| G[Scikit-learn Forecaster]
        Django -->|Query Records| H[(econext / db.sqlite3)]
    end

    subgraph CheckoutPipeline["4. Cart, Payment & Order Finalization"]
        Django -->|Create Online Order| J[Razorpay API]
        Django -->|Verify HMAC-SHA256| K[Verified Signature Check]
        Django -->|Atomic Order Placement| L[(Order DB)]
    end

    subgraph FulfillmentPipeline["5. Real-Time Logistics & GPS Tracking"]
        B -->|/api/order-ops/**| M[Order Operations Service :8084]
        M -->|Save Shipment & GPS| N[(econext_order_db)]
        M -.->|shipment.location.updated| O[Kafka KRaft :9092]
        O -->|Kafka Listener| M
        M -->|Broadcast Telemetry| P[STOMP Broker: /ws-tracking]
        P -.->|Live Feeds| Admin
        P -.->|Live Feeds| A
    end

    subgraph BigDataPipeline["6. Big Data Lake Ingestion"]
        O -->|Stream Read| Q[PySpark Structured Streaming]
        Q -->|Snappy Parquet| R[Hadoop HDFS: /econext/raw/]
    end
```

---

## 6. Detailed Sequence Diagrams

### 6.1 Admin / Staff Authentication & Stateless JWT Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Admin / Staff User
    participant Gateway as API Gateway (:8080)
    participant AdminSvc as Admin Staff Service (:8085)
    participant DB as MySQL (econext_auth_db)

    Staff->>Gateway: POST /api/admin/auth/login (username, password)
    Gateway->>AdminSvc: Route to admin-staff-service
    AdminSvc->>DB: Query admin_staff_members by username
    DB-->>AdminSvc: Return StaffMember with BCrypt hash & assigned roles
    AdminSvc->>AdminSvc: Verify BCrypt match
    AdminSvc->>AdminSvc: Generate JWT (userId, role, permissions list)
    AdminSvc-->>Gateway: Return { token, username, role, permissions }
    Gateway-->>Staff: 200 OK + Authoritative JWT
```

### 6.2 AI Visual Search & Price Prediction Discovery

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer
    participant Django as Django & ML Engine (:8000)
    participant CLIP as OpenAI CLIP / HSV Engine
    participant Forecaster as Scikit-learn Linear Regressor
    participant DB as MySQL / SQLite (Catalog DB)

    User->>Django: POST /api/products/search/visual/ (Uploaded Image)
    Django->>CLIP: Extract 512-dim embedding or 3D HSV histogram
    CLIP->>DB: Compute Cosine / Chi-Square distance against product vectors
    DB-->>CLIP: Return Top-K matched product IDs
    CLIP-->>Django: Matched Product Candidates
    Django-->>User: 200 OK with Ranked Product Cards

    User->>Django: GET /api/products/{id}/prediction/
    Django->>DB: Query 60-day PriceHistory records
    DB-->>Django: Historical time-series prices
    Django->>Forecaster: Fit Ordinary Least Squares (OLS) Regression
    Forecaster-->>Django: 7-day predicted prices + Buy/Wait recommendation + R² score
    Django-->>User: Render Interactive Forecast Chart
```

### 6.3 Razorpay Payment Flow & Zero Ghost-Order Integrity

```mermaid
sequenceDiagram
    autonumber
    actor Customer as User (Browser :5073)
    participant UserFE as Customer Frontend
    participant Django as Django Monolith (:8000)
    participant Razorpay as Razorpay API Server
    participant DB as Database

    Customer->>UserFE: Selects "Razorpay" & Clicks "Pay"
    UserFE->>Django: POST /api/payments/create-order/
    Note over Django: Resolves amount from Cart.<br/>Calculates strictly in paise.
    Django->>Razorpay: orders.create({ amount: 59900, currency: 'INR' })
    Razorpay-->>Django: Return { id: 'order_ThD5z2jvbQlPRW', amount: 59900 }
    Django-->>UserFE: Return { razorpay_order_id, razorpay_key_id, amount }

    UserFE->>Razorpay: Open Razorpay Standard Checkout Modal

    alt User Abandons / Cancels Payment
        Customer->>Razorpay: Closes Modal
        Razorpay-->>UserFE: modal.ondismiss
        UserFE-->>Customer: "Payment cancelled. No order placed."
        Note over DB: ZERO orders created. Cart remains intact.
    else User Authorizes Payment Successfully
        Customer->>Razorpay: Completes Payment (UPI / Card / NetBanking)
        Razorpay-->>UserFE: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        UserFE->>Django: POST /api/payments/verify/
        Note over Django: Computes HMAC-SHA256(order_id|payment_id, secret)<br/>Constant-time comparison.
        Django-->>UserFE: 200 OK { status: 'success' }

        UserFE->>Django: POST /api/orders/create/ with verified payment details
        Django->>DB: Atomic Order Placement & Stock Decrement
        UserFE->>UserFE: Clear Cart & Display Order Confirmation Screen
    end
```

### 6.4 10-Stage Sequential Fulfillment & Live GPS Tracking

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Logistics / Delivery Staff
    participant Gateway as API Gateway (:8080)
    participant OrderOps as Order Ops Service (:8084)
    participant DB as MySQL (econext_order_db)
    participant Kafka as Apache Kafka (:9092)
    participant STOMP as WebSocket Broker (/ws-tracking)
    actor Client as Customer / Admin Browser

    Staff->>Gateway: PATCH /api/order-ops/shipments/101/location { lat: 17.3850, lng: 78.4867, speed: 42.5 }
    Gateway->>OrderOps: Route to Order Operations Service (:8084)
    OrderOps->>DB: Update Shipment.currentLatitude, currentLongitude, lastLocationUpdate
    OrderOps->>DB: Insert into LogisticsTrackingEvent (shipment_id, lat, lng, event_type='GPS_PING')
    OrderOps-.->Kafka: Publish shipment.location.updated { shipmentId: 101, lat: 17.3850, lng: 78.4867 }
    Kafka->>OrderOps: Consume Kafka event stream
    OrderOps->>STOMP: Broadcast to /topic/shipments/101 and /topic/orders/{orderId}
    STOMP-->>Client: Push real-time GPS coordinate packet (Zero polling)
    OrderOps-->>Gateway: 200 OK { status: 'success', shipment: {...} }
    Gateway-->>Staff: Render live truck pin on Leaflet Map
```

---

## 7. Database Management System (DBMS) & Entity-Relationship (ER) Design

### 7.1 Comprehensive Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ USER_PROFILES : has
    USERS ||--o{ USER_ROLES : assigned
    ROLES ||--o{ USER_ROLES : contains
    ROLES ||--o{ ROLE_PERMISSIONS : defines
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : mapped

    CATEGORIES ||--o{ SUBCATEGORIES : contains
    CATEGORIES ||--o{ PRODUCTS : categorizes
    SUBCATEGORIES ||--o{ PRODUCTS : subcategorizes
    PRODUCTS ||--o{ PRODUCT_ECO_TAGS : tagged_with
    ECO_TAGS ||--o{ PRODUCT_ECO_TAGS : applied_to
    PRODUCTS ||--o{ PRICE_HISTORY : tracks
    PRODUCTS ||--o{ CART_ITEMS : added_in
    PRODUCTS ||--o{ ORDER_ITEMS : contains

    USERS ||--o{ CARTS : owns
    CARTS ||--o{ CART_ITEMS : includes

    USERS ||--o{ ORDERS : places
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ ORDER_STATUS_HISTORY : transitions
    ORDERS ||--o{ SHIPPING_ADDRESSES : ships_to
    ORDERS ||--o{ SHIPMENTS : fulfilled_by
    SHIPMENTS ||--o{ SHIPMENT_ITEMS : contains
    ORDER_ITEMS ||--o| SHIPMENT_ITEMS : allocated_to
    SHIPMENTS ||--o{ LOGISTICS_TRACKING_EVENTS : tracks
    CONTAINERS ||--o{ SHIPMENTS : transports

    ORDERS ||--o| PAYMENT_TRANSACTIONS : settled_by
    USERS ||--o{ PAYMENT_TRANSACTIONS : initiates
    PAYMENT_TRANSACTIONS ||--o{ REFUND_TRANSACTIONS : generates

    USERS ||--o{ NOTIFICATION_LOGS : receives
    USERS ||--o{ ACTIVITY_LOGS : generates
    USERS ||--o{ AUDIT_LOGS : records

    SHIPMENTS {
        bigint id PK
        bigint order_id FK
        varchar tracking_number UK
        varchar carrier_name
        varchar status
        varchar origin
        varchar destination
        decimal current_latitude
        decimal current_longitude
        datetime last_location_update
        datetime estimated_delivery
        datetime created_at
    }

    SHIPMENT_ITEMS {
        bigint id PK
        bigint shipment_id FK
        bigint order_item_id FK
        bigint product_id FK
        integer quantity
    }

    CONTAINERS {
        bigint id PK
        varchar container_code UK
        varchar status
        varchar origin
        varchar destination
        decimal current_latitude
        decimal current_longitude
        datetime last_location_update
        datetime created_at
    }

    LOGISTICS_TRACKING_EVENTS {
        bigint id PK
        bigint shipment_id FK
        varchar event_type
        varchar description
        decimal latitude
        decimal longitude
        datetime timestamp
    }

    USERS {
        bigint id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar first_name
        varchar last_name
        boolean is_active
        boolean is_staff
        datetime created_at
        datetime updated_at
    }

    USER_PROFILES {
        bigint id PK
        bigint user_id FK
        varchar phone
        text address
        varchar city
        varchar state
        varchar zipcode
        varchar country
        json preferences
    }

    ROLES {
        bigint id PK
        varchar role_name UK
        varchar description
    }

    PERMISSIONS {
        bigint id PK
        varchar permission_code UK
        varchar module_name
    }

    PRODUCTS {
        bigint id PK
        bigint category_id FK
        bigint subcategory_id FK
        varchar sku UK
        varchar name
        text description
        decimal current_price
        decimal original_price
        integer stock
        decimal sustainability_score
        varchar image_url
        json tags
        datetime created_at
    }

    ORDERS {
        bigint id PK
        bigint user_id FK
        varchar order_reference UK
        decimal total_amount
        varchar status
        varchar payment_method
        varchar payment_status
        varchar tracking_code
        datetime created_at
        datetime updated_at
    }

    ORDER_ITEMS {
        bigint id PK
        bigint order_id FK
        bigint product_id FK
        integer quantity
        decimal unit_price
        decimal subtotal
    }

    PAYMENT_TRANSACTIONS {
        bigint id PK
        bigint order_id FK
        bigint user_id FK
        varchar razorpay_order_id UK
        varchar razorpay_payment_id
        varchar razorpay_signature
        decimal amount
        varchar currency
        varchar status
        varchar payment_method
        datetime created_at
    }
```

---

## 8. Core Microservices & Bounded Contexts

The backend services are partitioned into distinct, domain-driven Maven submodules:

```
microservices/
├── api-gateway/                      # Port 8080 - Spring Cloud Gateway & Netty Ingress Proxy
├── admin-staff-service/              # Port 8085 - Authoritative Admin/Staff Identity & RBAC (SSOT)
├── order-operations-service/         # Port 8084 - GPS Shipments, 10-Stage Fulfillment & STOMP /ws-tracking
├── catalog-operations-service/       # Port 8082 - SKU Stock Ledger & Product Catalog Ops
├── auth-service/                     # Port 8081 - Customer Auth & JWT Issuance
├── cart-service/                     # Port 8083 - Stateful Shopping Cart Lifecycle
├── payment-service/                  # Port 8087 - Razorpay SDK & Cryptographic Verification
├── data-import-analysis-service/     # Port 8086 - Batch File Ingestion & Telemetry (Apache POI)
└── notification-service/             # Port 8089 - Kafka Event Notification Dispatcher
```

---

## 9. Razorpay Payment Gateway & Cryptographic Integrity

### 9.1 Zero Pre-Payment Online Checkout Flow
1. **Server-Side Order Generation**:
   The frontend requests an online checkout order via `POST /api/payments/create-order/`.
   The backend resolves the cart items, calculates the total amount strictly in **paise** ($₹1.00 = 100\text{ paise}$), and invokes the Razorpay SDK:
   $$\text{Amount in Paise} = \text{round}(\text{Amount in Rupees} \times 100)$$
2. **Cryptographic HMAC-SHA256 Signature Verification**:
   Upon customer payment completion in the Razorpay Modal, Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
   The server computes:
   $$\text{Expected Signature} = \text{HMAC-SHA256}\Big(\text{razorpay\_order\_id} \parallel \text{"|"} \parallel \text{razorpay\_payment\_id},\ \text{RAZORPAY\_KEY\_SECRET}\Big)$$
   The generated hash is compared in constant time (`MessageDigest.isEqual`) against the client signature to prevent timing attacks.
3. **Ghost-Order Prevention & Idempotency**:
   Zero orders or stock decrements occur until cryptographic signature verification succeeds. Duplicate webhook or retry calls are resolved idempotently.

---

## 10. AI & Machine Learning Engineering

```
backend/
├── ml_engine/
│   ├── price_predictor.py     # Scikit-learn Linear Regression 7-day forecaster
│   ├── visual_search.py       # OpenAI CLIP ViT-B/32 + FAISS + HSV Color Histogram
│   ├── intent_search.py       # TF-IDF Vectorizer + Cosine Similarity
│   ├── auto_tagger.py         # Multinomial Naive Bayes taxonomy classifier
│   └── models.py              # ML metadata and prediction caching
└── copilot/
    ├── chat_service.py        # Gemini pipeline with intent extraction & DB grounding
    ├── services.py            # Prompt orchestration & candidate retrieval
    └── prompts.py             # System prompt guardrails against hallucinations
```

* **Price Predictor**: Fits Ordinary Least Squares (OLS) regression over 60-day historical prices, computing 7-day future trajectories and confidence metrics ($R^2$).
* **Multi-Modal Visual Search**: Generates 512-dimensional embeddings via OpenAI CLIP (`clip-vit-base-patch32`) with an $8 \times 8 \times 8$ 3D HSV color histogram fallback.
* **Semantic Intent Search**: Computes TF-IDF vector embeddings over catalog descriptions for lifestyle phrase matching.
* **Context-Grounded Copilot**: Two-pass conversational commerce engine passing real inventory candidate cards into Google Gemini context windows.

---

## 11. Big Data Streaming, Real-Time Fulfillment & Hadoop Data Lake

Real-time operational events, logistics GPS coordinates, and customer telemetry stream into Apache Kafka KRaft brokers, broadcasting live updates via STOMP WebSocket and writing partitioned facts to Hadoop HDFS:

```
[ Microservices & Logistics Telemetry ]
       │
       ├──> shipment.status.updated     (Shipment transitions: PICKED_UP, IN_TRANSIT, DELIVERED)
       ├──> shipment.location.updated   (Real-time vehicle GPS latitude / longitude)
       ├──> container.status.updated    (Multimodal container milestones)
       ├──> order-events                (Fulfillment stage advancements)
       ├──> payment-events              (Razorpay payment captures)
       └──> user-search-events          (Clickstream and search queries)
              │
              ├───► [ STOMP WebSocket Broker (/ws-tracking) ]
              │          ├── /topic/orders/{orderId}
              │          ├── /topic/shipments/{shipmentId}
              │          ├── /topic/containers/{containerId}
              │          ├── /topic/fulfillment/activity
              │          └── /topic/fulfillment/analytics
              │
              ▼
     [ Apache Kafka KRaft Broker (:9092) ]
              │
              ▼
     [ PySpark Structured Streaming Engine ]
              │
              ▼ (Snappy-compressed Parquet partitioned by year/month/day)
     [ Hadoop HDFS: hdfs://localhost:9000/econext/ ]
           ├── /raw/                (Ingested raw event streams)
           ├── /processed/          (Cleaned tabular facts)
           └── /analytics/          (Aggregated daily KPI metrics)
```

---

## 12. Admin & Staff Operational Governance (RBAC/PBAC)

The operational management portal (`admin-frontend/`) connects to **Spring Boot `admin-staff-service` (`:8085`)** via the API Gateway as its Single Source of Truth, supporting **8 distinct operational roles** and dual-dashboard routing:

| Operational Role | Permissions Matrix | Primary Responsibilities & Accessible Modules |
| :--- | :--- | :--- |
| **`ROLE_ADMIN`** | `ALL_PERMISSIONS` (Full Governance) | Administrator Command Center, Staff Provisioning, Dynamic Role Assignment, Audit Logs, Live DB Switcher |
| **`INVENTORY_MANAGER`** | `INVENTORY_VIEW`, `INVENTORY_ADJUST` | Warehouse Stock Audits, Low-Stock Thresholds, Inventory Ledger |
| **`CATALOG_MANAGER`** | `CATALOG_VIEW`, `CATALOG_CREATE`, `CATALOG_EDIT` | Product Catalog, Category Hierarchies, Sustainability Badges |
| **`ORDER_MANAGER`** | `ORDER_VIEW`, `ORDER_STATUS_UPDATE`, `SHIPMENT_DISPATCH` | Order Lifecycle Oversight, Dispatch Scheduling, Cancellation Review |
| **`ORDER_PROCESSING_STAFF`** | `ORDER_VIEW`, `ORDER_STATUS_UPDATE` | Warehouse Picking, Item Packaging, Status Progression |
| **`DATA_ANALYST`** | `ANALYTICS_VIEW`, `DATA_EXPORT` | Sales Trends, Conversion Telemetry, Operational Metrics |
| **`DATA_ENTRY_STAFF`** | `CATALOG_VIEW`, `DATA_IMPORT` | Batch CSV / Excel SKU Ingestion, Catalog Sanitation |
| **`DELIVERY_STAFF`** | `SHIPMENT_VIEW`, `SHIPMENT_LOCATION_UPDATE` | GPS Route Inspection, Courier Handoffs, Proof-of-Delivery Updates |

---

## 13. Customer Storefront Experience

The customer storefront (`frontend/`) delivers an interactive, eco-conscious retail experience:
* **3-Theme System**: Instant switching between *Eco Mint*, *Clean White*, and *Dark Carbon*.
* **Segment Navigation**: Dedicated taxonomy portals for **Kids Mode**, **Teens**, **Men**, **Women**, and **Unisex**.
* **Visual Search Modal**: Direct drag-and-drop image search with instant visual similarity results.
* **Interactive Prediction Widgets**: 7-day price trajectory graphs with "Buy Now" vs "Wait" advice.
* **EcoNext Copilot**: Floating conversational shopping assistant.
* **Live GPS Tracking**: Real-time order and physical shipment location streaming via STOMP WebSocket (`/ws-tracking`).

---

## 14. API Route Matrix & Gateway Ingress Mapping

All external client traffic passes through the reactive Spring Cloud Gateway on port `8080`:

| Ingress Route Pattern | Target Destination | Method(s) | Functionality |
| :--- | :--- | :--- | :--- |
| `/api/auth/**` | `auth-service` (`:8081`) | ALL | Customer signup, login, JWT token issuance |
| `/api/admin/auth/login` | `admin-staff-service` (`:8085`) | POST | Admin & Staff credential authentication (Authoritative SSOT) |
| `/api/admin/auth/me` | `admin-staff-service` (`:8085`) | GET | Authenticated staff profile & permissions list |
| `/api/admin/staff/**`, `/api/staff/**` | `admin-staff-service` (`:8085`) | ALL | Staff provisioning, updates, and role assignments |
| `/api/admin/roles/**` | `admin-staff-service` (`:8085`) | GET | Dynamic operational role list for provisioning |
| `/api/order-ops/**` | `order-operations-service` (`:8084`) | ALL | Physical shipment creation, GPS updates, and analytics |
| `/ws-tracking` | `order-operations-service` (`:8084`) | WS/STOMP | Real-time WebSocket fulfillment & GPS streaming |
| `/api/catalog-ops/**` | `catalog-operations-service` (`:8082`) | ALL | Operational product & category CRUD |
| `/api/inventory-ops/**`| `catalog-operations-service` (`:8082`) | ALL | Inventory stock ledger adjustments & alerts |
| `/api/cart/**` | `cart-service` (`:8083`) | ALL | Shopping cart lifecycle & item mutations |
| `/api/payments/create-order` | `payment-service` (`:8087`) | POST | Server-side Razorpay order generation |
| `/api/payments/verify` | `payment-service` (`:8087`) | POST | HMAC-SHA256 payment signature verification |
| `/api/payments/razorpay/webhook/` | `payment-views` (`:8000`) | POST | Razorpay webhook event reconciliation |
| `/api/orders/create/` | `shop_cart` (`:8000`) | POST | Final order persistence with verification check |
| `/api/orders/**` | `shop_cart` (`:8000`) | ALL | Customer order history & tracking |
| `/api/products/search/visual/` | `backend` (`:8000`) | POST | CLIP / HSV image visual search |
| `/api/products/search/intent/` | `backend` (`:8000`) | GET | TF-IDF natural language intent search |
| `/api/products/<id>/prediction/`| `backend` (`:8000`) | GET | Scikit-learn 7-day price forecast |
| `/api/chat/`, `/api/copilot/` | `backend` (`:8000`) | POST | Google Gemini grounded conversational AI |
| `/api/**` *(Fallback)* | `backend` (`:8000`) | ALL | Customer commerce & catalog endpoints |

---

## 15. Group Contributions & Git Engineering History

```
+---------------------------------------------------------------------------------------+
|                             GROUP MEMBER RESPONSIBILITIES                             |
+---------------------------------------------------------------------------------------+
|  Member 1: Shiva Jinkalker                                                            |
|  - Architected the Java 21 / Spring Boot 3.3.4 multi-module microservice ecosystem    |
|  - Implemented Spring Cloud Gateway edge routing and dynamic fallback bridge          |
|  - Designed & developed React 19 Admin & Staff Portal with custom design tokens       |
|  - Built real-time GPS fulfillment engine with Kafka event streams & STOMP /ws-track  |
|  - Consolidated Admin/Staff authority to Spring Boot admin-staff-service (SSOT)       |
|  - Created Apache Kafka event emitters, PySpark streaming, and Hadoop HDFS ingestion  |
|  - Developed Payment & Notification microservices with Razorpay integration           |
|  - Fixed Razorpay pre-order flow with HMAC-SHA256 signature verification & idempotency|
|  - Implemented Redis OTP authentication and 10-stage sequential order state machine   |
|  - Modernized Customer Storefront to React 19 + Vite with 3-theme system & Kids Mode  |
+---------------------------------------------------------------------------------------+
|  Member 2: RajputAtul75 (Atul Singh)                                                  |
|  - Designed and built initial Django 5.1 & Django REST Framework monolithic backend   |
|  - Implemented core AI/ML services (Price Predictor, Visual Search, Intent Search)    |
|  - Integrated EcoNext AI Chat Assistant / Copilot with Google Gemini                  |
|  - Developed initial relational database models (Products, Categories, Cart, Orders)  |
|  - Implemented database migrations, MySQL database drivers, and Render deployment     |
|  - Handled automated product taxonomy tagging and visual search deduplication         |
+---------------------------------------------------------------------------------------+
```

---

## 16. Local Development Setup Guide

### 16.1 Prerequisites
* **Java**: OpenJDK 21 LTS (`java -version`)
* **Maven**: Apache Maven 3.9+ (`mvn -version`)
* **Python**: Python 3.11+ / 3.13 (`python --version`)
* **Node.js**: Node.js 18+ or 20+ & npm (`node -v`, `npm -v`)
* **Docker**: Docker Desktop with Docker Compose (`docker compose version`)
* **MySQL**: MySQL 8.0+ server running on `localhost:3306`

### 16.2 Step 1: Start Infrastructure (Docker / Local Services)
```bash
cd microservices
docker compose up -d
docker compose ps
```
* **Kafka UI Dashboard**: `http://localhost:8088/`
* **MySQL Port**: `localhost:3306` | **Redis Port**: `localhost:6379` | **Kafka Broker**: `localhost:9092`

### 16.3 Step 2: Run Python Django Backend & AI Engine
```bash
cd ../backend
# Activate virtual environment
.\.venv\Scripts\Activate.ps1
# Install dependencies (including mysqlclient, bcrypt, razorpay)
pip install -r requirements.txt
python manage.py check
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

### 16.4 Step 3: Run Java Spring Boot Microservices
```bash
cd ../microservices
mvn clean compile

# 1. Edge Gateway (Port 8080)
mvn spring-boot:run -pl api-gateway

# 2. Admin & Staff Service - SSOT (Port 8085)
mvn spring-boot:run -pl admin-staff-service

# 3. Order Operations & GPS Tracking Service (Port 8084)
mvn spring-boot:run -pl order-operations-service

# 4. Catalog Operations Service (Port 8082)
mvn spring-boot:run -pl catalog-operations-service

# 5. Payment Service (Port 8087)
mvn spring-boot:run -pl payment-service
```

### 16.5 Step 4: Run React 19 Frontends
```bash
# Admin & Staff Operations Portal (Port 5074)
cd ../admin-frontend && npm install && npm run dev -- --port 5074

# Customer Storefront (Port 5073)
cd ../frontend && npm install && npm run dev -- --port 5073
```

---

## 17. Verification, Quality Assurance & Test Suites

```
========================================================================================
                      AUTOMATED VERIFICATION & TEST RESULTS (STEPS 1 - 7.6)
========================================================================================
 [✓] Java Spring Boot Microservices Suite:   BUILD SUCCESS (10/10 Modules, 0 Failures)
     - api-gateway                           PASSED (8/8 Route & Fallback Tests)
     - admin-staff-service (SSOT)            PASSED (7/7 Auth, RBAC & Provisioning Tests)
     - order-operations-service              PASSED (6/6 GPS, Fulfillment & STOMP Tests)
     - catalog-operations-service            PASSED (JPA CRUD & Stock Ledger Tests)
     - cart-service                          PASSED (Cart Lifecycle & DTO Tests)
     - payment-service                       PASSED (Razorpay & Kafka Event Tests)
     - notification-service                  PASSED (Listener & Dispatch Tests)
     - data-import-analysis-service          PASSED (5/5 Excel/CSV & POI Tests)
 [✓] Admin & Staff Authority Verification:   100% Passed (Authoritative via Gateway :8080)
     - Spring Gateway Auth Ingress           PASSED (Routes /api/admin/** & /api/staff/** to :8085)
     - Admin Command Center Login            PASSED (200 OK, full governance permissions)
     - Dynamic 8-Role Provisioning           PASSED (INVENTORY_MANAGER, ORDER_MANAGER, etc.)
     - Role-Based Dashboard Segregation      PASSED (Admin Command Center vs Staff Workspaces)
     - Protected API Route Guards            PASSED (HTTP 401 unauthenticated, HTTP 403 unauthorized)
 [✓] Real-Time Fulfillment & GPS Suite:      100% Passed (Kafka + WebSocket STOMP Flow)
     - Physical Shipment Domain Model        PASSED (Order -> OrderItem -> Shipment -> ShipmentItem)
     - Live GPS Location Telemetry           PASSED (Latitude/Longitude updates broadcast via STOMP)
     - Leaflet / OpenStreetMap Integration   PASSED (Live vehicle tracking map on Admin Portal)
     - WebSocket STOMP Feeds (/ws-tracking)  PASSED (/topic/orders/{id}, /topic/shipments/{id})
 [✓] Razorpay & Payment Integrity Suite:     8 / 8 Tests Passed (All Scenarios Verified)
     - Server-side Razorpay order creation   PASSED (Strict paise amount calculation)
     - Cryptographic HMAC-SHA256 signature   PASSED (Valid verified, Invalid rejected)
     - Zero pre-payment ghost orders         PASSED (No order created without payment)
     - Post-payment verified order placement PASSED (payment_status=PAID, stock decremented)
     - Idempotency on duplicate callbacks    PASSED (Zero duplicate orders created)
     - Cash on Delivery flow                 PASSED (payment_status=PENDING, ORDER_PLACED)
 [✓] Frontend Production Builds:             100% Clean Compilation
     - Admin Frontend (React 19 / Vite)      PASSED (Compiled cleanly with 0 errors)
     - Customer Storefront (React 19 / Vite) PASSED (Compiled cleanly with 0 errors)
 [✓] Python Django Backend Suite:            PASSED (python manage.py check -> 0 issues)
========================================================================================
```

---

## 18. Planned Enhancements & Future Scope

* **Distributed OpenSearch Cluster**: Transitioning TF-IDF in-memory search to a dedicated distributed OpenSearch cluster.
* **Apache Flink Real-Time Complex Event Processing (CEP)**: Implementing sub-second fraud detection on payment events and anomalous purchase patterns.
* **Multi-Cloud Kubernetes Deployment (EKS / GKE)**: Container orchestration with Helm charts and automated horizontal pod autoscaling (HPA).
* **Advanced Neural Collaborative Filtering (NCF)**: Deep-learning-based recommendation engine incorporating real-time user session graphs.
* **Dynamic Automated Price Elasticity Modeling**: Reinforcement learning agents for automated merchant pricing optimization based on demand elasticity.

---

## 19. License & Acknowledgments

### 19.1 License
This project is open-source software licensed under the **[MIT License](LICENSE)**.

### 19.2 Academic Acknowledgments
Developed as a **Final-Year Group Capstone Project** in Computer Science & Engineering. We express our sincere gratitude to our project advisors, faculty mentors, and the open-source engineering community behind Spring Boot, Django, React, Apache Kafka, Apache Spark, and Google Gemini.
