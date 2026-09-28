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

The platform combines multi-modal artificial intelligence (computer vision similarity search, predictive price forecasting, TF-IDF natural language intent search, and LLM-grounded conversational commerce) with a high-throughput **Java 21 / Spring Boot 3.3.4 microservices architecture**, a **Spring Cloud API Gateway**, a dedicated **React 19 Admin & Staff Operations Portal**, a secure **Razorpay Online Payment & Webhook Gateway**, and an event-driven **Big Data streaming & Hadoop HDFS Data Lake** ingestion layer.

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
11. [Big Data Streaming & Hadoop HDFS Data Lake](#11-big-data-streaming--hadoop-hdfs-data-lake)
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
| **Distributed Order Synchronization** | Asynchronous event streaming & unified MySQL persistence |
| **Staff Governance & Auditing** | Granular RBAC/PBAC Admin Portal with forensic audit logging |
| **Real-Time Big Data Telemetry** | Apache Kafka KRaft + PySpark Streaming + Hadoop HDFS Data Lake |

---

## 2. Project Objectives & Scope

The primary engineering objectives of this final-year capstone project are:
* **Deliver Intelligent Product Discovery**: Implement multi-modal AI search allowing customers to query using images (CLIP ViT-B/32 & color histograms) or natural language intents (TF-IDF vectorizer).
* **Provide Algorithmic Shopping Intelligence**: Build an interpretable 60-day historical price forecasting engine projecting 7-day price trajectories with explicit "Buy Now" or "Wait" recommendation confidence scores.
* **Integrate Guardrailed Generative AI**: Deploy a context-grounded shopping chatbot assistant using Google Gemini, grounded strictly on real database inventory to eliminate hallucinations.
* **Guarantee Payment & Fulfillment Integrity**: Implement a secure Razorpay online payment flow with server-side amount calculation, cryptographic HMAC-SHA256 signature verification, and zero ghost-order creation.
* **Architect a Scalable Microservices Ecosystem**: Decouple business domains into independent Spring Boot microservices with Spring Cloud Gateway routing, stateless JWT security, and domain-owned MySQL database clusters.
* **Implement Role-Based Governance (RBAC/PBAC)**: Develop a secure, colorful operational administration portal enabling fine-grained access control across catalog managers, inventory handlers, order dispatchers, and analysts.
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
        AuthService["Auth & User Service<br/>(:8081)"]
        CatalogOpsService["Catalog & Inventory Ops<br/>(:8082)"]
        CartService["Shopping Cart Service<br/>(:8083)"]
        OrderOpsService["Order Fulfillment Ops<br/>(:8084)"]
        AdminStaffService["Admin & Staff Core<br/>(:8085)"]
        ImportAnalysisService["Data Import & Analytics<br/>(:8086)"]
        PaymentService["Payment Service (Razorpay)<br/>(:8087)"]
        NotificationService["Notification Service<br/>(:8089)"]
    end

    subgraph PythonLayer["Python Django & AI Engine (Port 8000)"]
        DjangoCore["Django REST Framework Core"]
        PaymentVerifier["Razorpay HMAC-SHA256 Verifier"]
        VisualSearchEngine["CLIP ViT / HSV Color Search"]
        PricePredictor["Linear Regression Price Forecaster"]
        IntentSearch["TF-IDF Intent Search"]
        GeminiCopilot["Google Gemini AI Assistant"]
    end

    subgraph PersistenceLayer["Databases & In-Memory Caches"]
        MySQLCluster[("MySQL 8.0 Cluster<br/>(Multi-DB Schema Isolation)")]
        RedisCache[("Redis 7<br/>(Cache & OTP Store)")]
    end

    subgraph BigDataLayer["Big Data Streaming & Storage"]
        KafkaBroker["Apache Kafka KRaft Broker<br/>(Port 9092)"]
        SparkEngine["Spark Structured Streaming & Analytics"]
        HadoopHDFS[("Apache Hadoop HDFS Data Lake<br/>hdfs://localhost:9000/econext/")]
    end

    CustomerStore -->|HTTP / REST| Gateway
    AdminPortal -->|HTTP / JWT| Gateway

    Gateway -->|/api/auth/**| AuthService
    Gateway -->|/api/catalog-ops/**| CatalogOpsService
    Gateway -->|/api/cart/**| CartService
    Gateway -->|/api/order-ops/**| OrderOpsService
    Gateway -->|/api/admin/**, /api/staff/**| AdminStaffService
    Gateway -->|/api/import/**, /api/analytics/**| ImportAnalysisService
    Gateway -->|/api/payments/**| PaymentService
    Gateway -->|/api/notifications/**| NotificationService
    Gateway -->|/api/copilot/**, /api/products/**, /api/** (Fallback)| DjangoCore

    AuthService --> MySQLCluster
    CatalogOpsService --> MySQLCluster
    CartService --> MySQLCluster
    OrderOpsService --> MySQLCluster
    AdminStaffService --> MySQLCluster
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

    DjangoCore -.->|Clickstream & Searches| KafkaBroker
    CatalogOpsService -.->|Inventory Events| KafkaBroker
    OrderOpsService -.->|Order State Events| KafkaBroker
    PaymentService -.->|Payment Events| KafkaBroker

    KafkaBroker --> NotificationService
    KafkaBroker --> SparkEngine
    SparkEngine --> HadoopHDFS
```

### 3.2 Architectural Principles & Patterns
1. **Strangler Fig / Hybrid Migration Pattern**: Operational services are progressively migrated to Java 21 / Spring Boot 3.3.4, while mature AI/ML pipelines and legacy endpoints remain hosted on Django 5.1, seamlessly unified behind the Spring Cloud Gateway.
2. **Database-per-Service Pattern**: Each microservice manages its own dedicated schema within the MySQL 8.0 cluster to enforce loose coupling and strict bounded contexts.
3. **Event-Driven Choreography**: Critical domain transitions (payments, inventory adjustments, order states) publish asynchronous JSON messages to Apache Kafka KRaft topics.
4. **Stateless Security**: Zero server-side session state; authentication relies on cryptographically signed HMAC-SHA256 JWT tokens.
5. **Zero Trust & Defense in Depth**: Strict validation at the API Gateway, service-level Spring Security filters, and SQL parameterization via ORM.

---

## 4. Technology Stack Matrix

| Layer | Technology | Purpose & Description |
| :--- | :--- | :--- |
| **Customer Frontend** | React 19.2.3, Vite 6.4.3 | High-performance SPA (Port `5073`) with component-based state, Framer Motion transitions, and React Toastify notifications. |
| **Storefront Styling** | CSS Modules & Design Tokens | 3-Theme System (*Eco Mint*, *Clean White*, *Dark Carbon*) adhering to strict accessibility contrast standards. |
| **Admin Frontend** | React 19, Vite, Lucide Icons | Dedicated operational portal (Port `5074`) with interactive Theme Lamp toggle, role-aware sidebar, and data tables. |
| **Edge API Gateway** | Spring Cloud Gateway (Netty) | Non-blocking reactive edge proxy (Port `8080`) providing centralized routing, CORS handling, and fallback bridging. |
| **Microservices Backend** | Java 21 LTS, Spring Boot 3.3.4 | Multi-module enterprise microservices utilizing Spring Data JPA, Spring Security 6, and Hibernate ORM. |
| **Core Monolith & AI** | Python 3.11+ / 3.13, Django 5.1.6 | REST API framework (DRF 3.15, Port `8000`), ML model hosting, and catalog synchronization. |
| **Relational Database** | MySQL 8.0 (Community Server) | Domain-isolated schemas (`econext`, `econext_auth_db`, `econext_cart_db`, `econext_order_db`, `econext_payment_db`, `econext_notification_db`, `econext_analytics_db`). |
| **Dev Database Fallback** | SQLite 3 | Zero-configuration local development persistence fallback for the Django application. |
| **In-Memory Cache & OTP** | Redis 7 (Alpine) | Distributed TTL cache, rate limiting, and OTP password-reset verification store. |
| **Payment Gateway** | Razorpay SDK & Webhooks | Server-side order creation, HMAC-SHA256 signature verification, and webhook reconciliation. |
| **Visual Search AI** | OpenAI CLIP (`ViT-B/32`) & FAISS | 512-dimensional vector embedding visual similarity retrieval with 3D HSV/RGB color histogram fallback. |
| **Predictive AI** | Scikit-learn (Linear Regression) | 60-day historical time-series price trajectory predictor outputting 7-day forecasts and buy/wait recommendations. |
| **Intent Search NLP** | Scikit-learn (TF-IDF Vectorizer) | Natural language lifestyle query transformation and cosine similarity catalog retrieval. |
| **Conversational AI** | Google Gemini (via OpenAI API bridge) | Context-aware shopping assistant grounded with real database candidate products. |
| **Automated Tagger** | Scikit-learn (Multinomial Naive Bayes) | Supervised classification of product metadata into age groups and gender categories. |
| **Event Broker** | Apache Kafka 3.7 (KRaft Mode) | Distributed event streaming broker operating without ZooKeeper across 5 high-throughput topics. |
| **Stream Processing** | Apache Spark 3.5 (PySpark) | Structured Streaming pipeline reading Kafka topics and checkpointing date-partitioned Parquet files to HDFS. |
| **Distributed Data Lake** | Apache Hadoop 3.x (HDFS) | Multi-tier analytical storage lake (`/econext/raw/`, `/econext/processed/`, `/econext/analytics/`). |
| **Data Ingestion** | Apache POI 5.3, OpenCSV 5.9 | High-performance batch parser for Excel (`.xlsx`, `.xls`) and CSV product catalog uploads. |
| **Authentication** | JJWT 0.12.6 / SimpleJWT | Stateless HMAC-SHA256 JWT access (24h) and refresh (7d) token security with BCrypt password hashing. |
| **Containerization** | Docker & Docker Compose | Containerized infrastructure for MySQL 8, Redis 7, Kafka KRaft, and Kafka-UI. |
| **Build Automation** | Maven 3.9+ & npm | Multi-module Java lifecycle management and Node package compilation. |

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
        GatewayCore["Spring Cloud Gateway (:8080)<br/>& Microservices Core"]
        AIEngine["AI / ML Analytics Engine (:8000)"]
        Database[("MySQL 8.0 Cluster")]
    end

    Customer -->|Searches, Orders, Carts, Payments| GatewayCore
    GatewayCore -->|Catalog, Order Confirmations, Receipts| Customer

    Staff -->|Catalog Updates, Order Dispatches, Ingestion| GatewayCore
    GatewayCore -->|Metrics, Live Dashboards, Audit Logs| Staff

    GatewayCore <-->|Order Tokens, Signatures, Webhooks| PaymentGateway
    GatewayCore <-->|Candidate Grounding, Forecasts, Visual Embeddings| AIEngine
    GatewayCore <-->|ACID Transactions, Read/Write Ledgers| Database

    GatewayCore -->|Clickstream, Orders, Inventory Events| KafkaBroker
    KafkaBroker -->|Structured Parquet Streaming| DataLake
```

### 5.2 Level 1: End-to-End E-Commerce & Big Data Pipeline Flow

```mermaid
flowchart TD
    subgraph Ingress["1. Ingress & Traffic Routing"]
        A[Customer Browser :5073] -->|HTTP Request| B[API Gateway :8080]
        Admin[Admin Portal :5074] -->|HTTP Request| B
    end

    subgraph AuthPipeline["2. Authentication & Authorization"]
        B -->|/api/auth/**| C[Auth Service :8081]
        C -->|Validate & Sign| D[(econext_auth_db)]
        C -->|Issue JWT| B
    end

    subgraph DiscoveryPipeline["3. AI Product Discovery & Catalog"]
        B -->|/api/products/**| E[Django Core & ML Engine :8000]
        E -->|Query Features| F[CLIP ViT / HSV Index]
        E -->|Query History| G[Scikit-learn Forecaster]
        E -->|Fetch Records| H[(econext)]
    end

    subgraph CheckoutPipeline["4. Cart, Payment & Order Finalization"]
        B -->|/api/cart/**| I[Cart Service :8083]
        B -->|/api/payments/create-order| J[Payment Service :8087]
        J -->|API Call| K[Razorpay Server]
        K -->|Return Order ID| J
        B -->|/api/payments/verify| J
        J -->|HMAC-SHA256 Match| L[(econext_payment_db)]
        B -->|/api/orders/create/| M[Order Ops / Django]
        M -->|Atomic Transaction| N[(econext_order_db / econext)]
    end

    subgraph TelemetryPipeline["5. Big Data Streaming & Lake Ingestion"]
        E -.->|Emit Clickstream| O[Kafka KRaft :9092]
        J -.->|Emit Payment Event| O
        M -.->|Emit Order Event| O
        O -->|Stream Read| P[PySpark Structured Streaming]
        P -->|Partitioned Append| Q[Hadoop HDFS: /econext/raw/]
    end
```

---

## 6. Detailed Sequence Diagrams

### 6.1 Authentication & Stateless JWT Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant Gateway as API Gateway (:8080)
    participant Auth as Auth Service (:8081)
    participant DB as MySQL (econext_auth_db)
    participant Redis as Redis (OTP Cache)

    User->>Gateway: POST /api/auth/login (username, password)
    Gateway->>Auth: Forward to AuthService
    Auth->>DB: Query user by username/email
    DB-->>Auth: Return User entity with BCrypt password hash
    Auth->>Auth: Verify BCrypt match
    Auth->>Auth: Generate Access Token (24h) & Refresh Token (7d)
    Auth-->>Gateway: Return { access, refresh, user: {...} }
    Gateway-->>User: 200 OK + JWT Tokens

    Note over User, Gateway: Authenticated Request Flow
    User->>Gateway: GET /api/cart/ with Authorization: Bearer <access_token>
    Gateway->>Gateway: Verify JWT Signature & Expiry
    Gateway->>Gateway: Extract Claims (userId, role)
    Gateway-->>User: Forward request with X-User-Id / X-User-Role headers
```

### 6.2 AI Visual Search & Price Prediction Discovery

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer
    participant Gateway as API Gateway (:8080)
    participant Django as Django & ML Engine (:8000)
    participant CLIP as OpenAI CLIP / HSV Engine
    participant Forecaster as Scikit-learn Linear Regressor
    participant DB as MySQL (Catalog DB)

    User->>Gateway: POST /api/products/search/visual/ (Uploaded Image)
    Gateway->>Django: Forward Image Payload
    Django->>CLIP: Extract 512-dim embedding or 3D HSV histogram
    CLIP->>DB: Compute Cosine / Chi-Square distance against product vectors
    DB-->>CLIP: Return Top-K matched product IDs
    CLIP-->>Django: Matched Product Candidates
    Django-->>Gateway: Return Visual Search Results
    Gateway-->>User: 200 OK with Ranked Product Cards

    User->>Gateway: GET /api/products/{id}/prediction/
    Gateway->>Django: Forward Request
    Django->>DB: Query 60-day PriceHistory records
    DB-->>Django: Historical time-series prices
    Django->>Forecaster: Fit Ordinary Least Squares (OLS) Regression
    Forecaster-->>Django: 7-day predicted prices + Buy/Wait recommendation + R² score
    Django-->>Gateway: Return Price Forecast JSON
    Gateway-->>User: Render Interactive Forecast Chart
```

### 6.3 Razorpay Payment Flow & Zero Ghost-Order Integrity

```mermaid
sequenceDiagram
    autonumber
    actor Customer as User (Browser :5073)
    participant UserFE as User Frontend
    participant Gateway as API Gateway (:8080)
    participant PaymentSvc as Payment Service (:8087)
    participant Razorpay as Razorpay API Server
    participant DB as MySQL Database
    participant Kafka as Apache Kafka (:9092)

    Customer->>UserFE: Selects "Razorpay" & Clicks "Pay"
    UserFE->>Gateway: POST /api/payments/create-order
    Gateway->>PaymentSvc: Route to Payment Service
    Note over PaymentSvc: Resolves amount from Cart.<br/>Reads RAZORPAY_KEY_ID & SECRET from Environment.
    PaymentSvc->>Razorpay: orders.create({ amount: 59900, currency: 'INR' })
    Razorpay-->>PaymentSvc: Return { id: 'order_ThD5z2jvbQlPRW', amount: 59900 }
    PaymentSvc->>DB: Save PaymentTransaction (status='PENDING', razorpay_order_id)
    PaymentSvc-->>Gateway: Return { razorpay_order_id, razorpay_key_id, amount }
    Gateway-->>UserFE: 201 Created (Zero secrets exposed)

    UserFE->>Razorpay: Open Razorpay Standard Checkout Modal

    alt User Abandons / Cancels Payment
        Customer->>Razorpay: Closes Modal
        Razorpay-->>UserFE: modal.ondismiss
        UserFE-->>Customer: "Payment cancelled. No order placed."
        Note over DB: ZERO orders created. Cart remains intact.
    else User Authorizes Payment Successfully
        Customer->>Razorpay: Completes Payment (UPI / Card / NetBanking)
        Razorpay-->>UserFE: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        UserFE->>Gateway: POST /api/payments/verify
        Gateway->>PaymentSvc: Route Verification Payload
        Note over PaymentSvc: Computes HMAC-SHA256(order_id|payment_id, secret)<br/>Constant-time MessageDigest.isEqual match.
        PaymentSvc->>DB: Update PaymentTransaction (status='SUCCESS', payment_id)
        PaymentSvc-.->Kafka: Publish PaymentEvent (status='SUCCESS')
        PaymentSvc-->>Gateway: Return Verification SUCCESS
        Gateway-->>UserFE: 200 OK

        UserFE->>Gateway: POST /api/orders/create/ with verified payment details
        Gateway->>DB: Atomic Order Persistence & Stock Decrement
        UserFE->>UserFE: Clear Cart & Display Order Confirmation Screen
    end
```

### 6.4 10-Stage Sequential Order Fulfillment State Machine

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Admin / Order Staff
    participant Gateway as API Gateway (:8080)
    participant OrderOps as Order Ops Service (:8084)
    participant DB as MySQL (econext_order_db)
    participant Kafka as Apache Kafka (:9092)
    participant NotifSvc as Notification Service (:8089)

    Note over Staff, DB: Allowed Transitions: PENDING -> PAYMENT_CONFIRMED -> PROCESSING -> SHIPPED -> OUT_FOR_DELIVERY -> DELIVERED
    Staff->>Gateway: PATCH /api/admin/orders/101/status/ { status: 'SHIPPED', tracking_code: 'ECO-TRK-9876' }
    Gateway->>OrderOps: Route to Order Operations Service
    OrderOps->>DB: Check current state against transition rules
    OrderOps->>DB: Update Order.status='SHIPPED', Order.tracking_code='ECO-TRK-9876'
    OrderOps->>DB: Insert into OrderStatusHistory (order_id, from='PROCESSING', to='SHIPPED', staff_id)
    OrderOps-.->Kafka: Publish order-events { orderId: 101, status: 'SHIPPED' }
    Kafka->>NotifSvc: Consume order event
    NotifSvc->>DB: Record NotificationLog & dispatch customer SMS/Email
    OrderOps-->>Gateway: 200 OK { status: 'success', order: {...} }
    Gateway-->>Staff: Return updated order entity
```

### 6.5 Big Data Telemetry Streaming to Hadoop HDFS

```mermaid
sequenceDiagram
    autonumber
    actor Shopper as Customer Activity
    participant WebApp as Web Backend
    participant Kafka as Kafka KRaft Broker (:9092)
    participant Spark as PySpark Structured Streaming
    participant HDFS as Hadoop HDFS Data Lake

    Shopper->>WebApp: Search, View Product, Add to Cart, Place Order
    WebApp-.->Kafka: Async Publish JSON Event (user-search-events / product-view-events)
    Note over Kafka: Partitions event streams by key (user_id / product_id)
    Kafka->>Spark: Continuous Micro-Batch Stream Ingestion (Trigger: 10s)
    Spark->>Spark: Parse JSON schema, extract event timestamps, enrich metadata
    Spark->>Spark: Repartition by date (year=YYYY/month=MM/day=DD)
    Spark->>HDFS: Append Snappy-compressed Parquet files to /econext/raw/
    Note over HDFS: Periodic Batch Analytics script computes daily demand & category KPIs
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

    ORDERS ||--o| PAYMENT_TRANSACTIONS : settled_by
    USERS ||--o{ PAYMENT_TRANSACTIONS : initiates
    PAYMENT_TRANSACTIONS ||--o{ REFUND_TRANSACTIONS : generates

    USERS ||--o{ NOTIFICATION_LOGS : receives
    USERS ||--o{ ACTIVITY_LOGS : generates
    USERS ||--o{ AUDIT_LOGS : records

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

    CATEGORIES {
        bigint id PK
        varchar name UK
        varchar slug UK
        text description
        varchar icon_name
        boolean is_active
    }

    SUBCATEGORIES {
        bigint id PK
        bigint category_id FK
        varchar name
        varchar slug
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
        json embedding_vector
        datetime created_at
    }

    PRICE_HISTORY {
        bigint id PK
        bigint product_id FK
        decimal recorded_price
        date recorded_date
        datetime created_at
    }

    ECO_TAGS {
        bigint id PK
        varchar tag_name UK
        varchar badge_color
        text eco_criteria
    }

    CARTS {
        bigint id PK
        bigint user_id FK
        datetime created_at
        datetime updated_at
    }

    CART_ITEMS {
        bigint id PK
        bigint cart_id FK
        bigint product_id FK
        integer quantity
        datetime added_at
    }

    ORDERS {
        bigint id PK
        bigint user_id FK
        varchar order_reference UK
        decimal total_amount
        varchar status
        varchar payment_method
        varchar payment_status
        varchar razorpay_order_id
        varchar razorpay_payment_id
        varchar razorpay_signature
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

    ORDER_STATUS_HISTORY {
        bigint id PK
        bigint order_id FK
        varchar from_status
        varchar to_status
        varchar notes
        bigint updated_by_user_id FK
        datetime created_at
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
        text error_message
        datetime created_at
        datetime updated_at
    }

    NOTIFICATION_LOGS {
        bigint id PK
        bigint user_id FK
        varchar notification_type
        varchar channel
        varchar title
        text message
        boolean is_read
        datetime sent_at
    }

    AUDIT_LOGS {
        bigint id PK
        bigint actor_user_id FK
        varchar action_type
        varchar target_entity
        bigint target_entity_id
        varchar client_ip
        json changes_diff
        datetime created_at
    }
```

### 7.2 Database Normalization & DBMS Dictionary

The relational database architecture is strictly normalized to **Third Normal Form (3NF)** with Boyce-Codd Normal Form (BCNF) compliance on identity and security tables.

#### Table: `payment_transactions` (Database: `econext_payment_db`)
| Column Name | Data Type | Nullable | Key / Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `NO` | `PRIMARY KEY (AUTO_INCREMENT)` | Unique internal transaction identifier |
| `order_id` | `BIGINT` | `YES` | `INDEX (idx_order_id)` | Reference to finalized customer order |
| `user_id` | `BIGINT` | `NO` | `INDEX (idx_user_status)` | Authenticated customer identifier |
| `razorpay_order_id`| `VARCHAR(100)`| `YES` | `UNIQUE INDEX (idx_rzp_order_id)` | Official Razorpay server order token (`order_...`) |
| `razorpay_payment_id`| `VARCHAR(100)`| `YES` | `INDEX` | Razorpay captured payment reference (`pay_...`) |
| `razorpay_signature`| `VARCHAR(255)`| `YES` | - | Cryptographic HMAC-SHA256 signature string |
| `amount` | `DECIMAL(10,2)`| `NO` | `CHECK (amount >= 1.00)` | Transaction monetary amount in INR |
| `currency` | `VARCHAR(10)` | `NO` | `DEFAULT 'INR'` | Transaction ISO currency code |
| `status` | `VARCHAR(30)` | `NO` | `INDEX` | State: `CREATED`, `PENDING`, `SUCCESS`, `FAILED` |
| `payment_method` | `VARCHAR(50)` | `YES` | - | Method: `RAZORPAY`, `RAZORPAY_UPI`, `COD` |
| `error_message` | `TEXT` | `YES` | - | Diagnostic error description on failure |
| `created_at` | `DATETIME(6)` | `NO` | - | Transaction creation timestamp |
| `updated_at` | `DATETIME(6)` | `YES` | - | Last modification timestamp |

---

## 8. Core Microservices & Bounded Contexts

The backend services are partitioned into distinct, domain-driven Maven submodules:

```
microservices/
├── api-gateway/                      # Port 8080 - Spring Cloud Gateway & Ingress
├── auth-service/                     # Port 8081 - Customer Auth & JWT Tokens
├── catalog-operations-service/       # Port 8082 - Product CRUD & SKU Stock Ledger
├── cart-service/                     # Port 8083 - Stateful Shopping Cart
├── order-operations-service/         # Port 8084 - 10-Stage Fulfillment State Machine
├── admin-staff-service/              # Port 8085 - Staff Governance & Audit Trails
├── data-import-analysis-service/     # Port 8086 - Batch File Ingestion & Telemetry
├── payment-service/                  # Port 8087 - Razorpay SDK & Cryptographic Verification
└── notification-service/             # Port 8089 - Kafka Event Notification Dispatcher
```

---

## 9. Razorpay Payment Gateway & Cryptographic Integrity

### 9.1 Zero Pre-Payment Online Checkout Flow
1. **Server-Side Order Generation**:
   The frontend requests an online checkout order via `POST /api/payments/create-order`.
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

## 11. Big Data Streaming & Hadoop HDFS Data Lake

Real-time telemetry streams from microservices into Apache Kafka KRaft brokers and writes to Hadoop HDFS via PySpark:

```
[ Microservices Telemetry ]
       │
       ├──> user-search-events     (Search queries, category filters)
       ├──> product-view-events    (Page dwell time, impression IDs)
       ├──> cart-events            (Cart mutations, add-to-cart actions)
       ├──> order-events           (Checkout conversions, status updates)
       └──> payment-events         (Payment captures, gateway transitions)
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

The operational management portal (`admin-frontend/`) is built with **React 19** and **Lucide React** icons:

| System Role | Permissions Matrix | Accessible Admin Modules |
| :--- | :--- | :--- |
| **`ROLE_ADMIN`** | `ALL_PERMISSIONS` (Full Governance) | All Modules, Audit Logs, Staff Governance, Live Sources |
| **`ROLE_CATALOG_STAFF`** | `CATALOG_VIEW`, `CATALOG_CREATE`, `CATALOG_EDIT` | Product Catalog, Category Hierarchies |
| **`ROLE_INVENTORY_STAFF`**| `INVENTORY_VIEW`, `INVENTORY_ADJUST` | Inventory Stock Ledger, Threshold Alerts |
| **`ROLE_ORDER_STAFF`** | `ORDER_VIEW`, `ORDER_STATUS_UPDATE` | Order Fulfillment, 10-Stage State Machine |
| **`ROLE_ANALYTICS_STAFF`**| `ANALYTICS_VIEW`, `DATA_IMPORT` | Big Data Telemetry, Bulk Ingestion Wizard |

---

## 13. Customer Storefront Experience

The customer storefront (`frontend/`) delivers an interactive, eco-conscious retail experience:
* **3-Theme System**: Instant switching between *Eco Mint*, *Clean White*, and *Dark Carbon*.
* **Segment Navigation**: Dedicated taxonomy portals for **Kids Mode**, **Teens**, **Men**, **Women**, and **Unisex**.
* **Visual Search Modal**: Direct drag-and-drop image search with instant visual similarity results.
* **Interactive Prediction Widgets**: 7-day price trajectory graphs with "Buy Now" vs "Wait" advice.
* **EcoNext Copilot**: Floating conversational shopping assistant.

---

## 14. API Route Matrix & Gateway Ingress Mapping

All external client traffic passes through the reactive Spring Cloud Gateway on port `8080`:

| Ingress Route Pattern | Target Destination | Method(s) | Functionality |
| :--- | :--- | :--- | :--- |
| `/api/auth/**` | `auth-service` (`:8081`) | ALL | Customer signup, login, JWT token issuance |
| `/api/admin/auth/login` | `admin-staff-service` (`:8085`) | POST | Admin & Staff credential authentication |
| `/api/admin/auth/me` | `admin-staff-service` (`:8085`) | GET | Authenticated staff profile & capability list |
| `/api/admin/orders/**` | `Django Core / order-ops` | GET, PATCH | Admin order management & status transitions |
| `/api/admin/payments/**`| `Django Core / payment-service` | GET | Admin payment transaction ledger |
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
| `/api/**` *(Fallback)* | `backend` (`:8000`) | ALL | Monolithic Django endpoints & accounts |

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

# 2. Admin & Staff Service (Port 8085)
mvn spring-boot:run -pl admin-staff-service

# 3. Auth Service (Port 8081)
mvn spring-boot:run -pl auth-service

# 4. Payment Service (Port 8087)
mvn spring-boot:run -pl payment-service
```

### 16.5 Step 4: Run React 19 Frontends
```bash
# Admin Portal (Port 5074 / 5174)
cd ../admin-frontend && npm install && npm run dev -- --port 5074

# Customer Storefront (Port 5073 / 5173)
cd ../frontend && npm install && npm run dev -- --port 5073
```

---

## 17. Verification, Quality Assurance & Test Suites

```
========================================================================================
                      AUTOMATED VERIFICATION & TEST RESULTS
========================================================================================
 [✓] Java Spring Boot Microservices Suite:   BUILD SUCCESS (10/10 Modules, 0 Failures)
     - api-gateway                           PASSED (3/3 Tests)
     - auth-service                          PASSED (Context Load & JWT Tests)
     - cart-service                          PASSED (Cart Lifecycle & DTO Tests)
     - payment-service                       PASSED (Razorpay & Kafka Event Tests)
     - notification-service                  PASSED (Listener & Dispatch Tests)
     - admin-staff-service                   PASSED (RBAC & Audit Trail Tests)
     - catalog-operations-service            PASSED (JPA CRUD & Threshold Tests)
     - order-operations-service              PASSED (10-Stage State Machine Tests)
     - data-import-analysis-service          PASSED (5/5 Excel/CSV & POI Tests)
 [✓] Authentication & Security Test Suite:   100% Passed (All Workflows Operational)
     - Django Monolith Auth (/api/auth/)     PASSED (BCrypt password hashing & SimpleJWT)
     - Admin Staff Portal Auth (/admin/auth) PASSED (RBAC token generation & validation)
     - Invalid Credential Handling (401)     PASSED (Accurate 401 response, zero 500s)
     - Spring Gateway Auth Proxying          PASSED (Routes /api/auth & /api/admin)
     - Protected API Route Guards            PASSED (Rejection on unauthenticated access)
 [✓] Razorpay & COD Payment Test Suite:      8 / 8 Tests Passed (All Scenarios Verified)
     - Server-side Razorpay order creation   PASSED (Paise amount calculation)
     - Cryptographic HMAC-SHA256 signature   PASSED (Valid verified, Invalid rejected)
     - Zero pre-payment unverified block     PASSED (No order created without payment)
     - Post-payment verified order placement PASSED (payment_status=PAID, stock decremented)
     - Idempotency on duplicate callbacks    PASSED (Zero duplicate orders created)
     - Non-breaking Cash on Delivery flow    PASSED (payment_status=PENDING, ORDER_PLACED)
     - Admin Orders & Payments API audit     PASSED (Reflected in Admin live tables)
     - Razorpay Webhook Event Processing     PASSED (Reconciled payment_status to PAID)
 [✓] Admin Frontend Production Build:        Compiled Cleanly with Vite (0 Errors)
 [✓] Customer Storefront Build:              Compiled Cleanly with Vite (0 Errors)
 [✓] Apache Kafka KRaft Ingestion Topics:     5 / 5 Topics Initialized & Verified
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
