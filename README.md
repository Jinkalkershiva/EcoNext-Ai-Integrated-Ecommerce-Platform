# EcoNext — AI-Integrated E-Commerce, Spring Boot Microservices & Big Data Platform

[![Java](https://img.shields.io/badge/Java-21%20LTS-orange.svg?logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Cloud](https://img.shields.io/badge/Spring%20Cloud-2023.0.3-green.svg)](https://spring.io/projects/spring-cloud)
[![Python](https://img.shields.io/badge/Python-3.11%2B%20%2F%203.13-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.1.6-darkgreen.svg?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Django REST Framework](https://img.shields.io/badge/DRF-3.15-red.svg)](https://www.django-rest-framework.org/)
[![React 19](https://img.shields.io/badge/React-19.2.3-cyan.svg?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7%20Alpine-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-3.7%20KRaft-black.svg?logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![Apache Spark](https://img.shields.io/badge/Apache%20Spark-3.5%20Structured%20Streaming-E25A1C.svg?logo=apachespark&logoColor=white)](https://spark.apache.org/)
[![Apache Hadoop](https://img.shields.io/badge/Apache%20Hadoop-HDFS%20Data%20Lake-66CCFF.svg?logo=apachehadoop&logoColor=white)](https://hadoop.apache.org/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.4%2B-F7931E.svg?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![Google Gemini](https://img.shields.io/badge/AI%20Copilot-Google%20Gemini-8E75B2.svg?logo=google&logoColor=white)](https://ai.google.dev/)
[![Build Status](https://img.shields.io/badge/Build-Passing%20(100%25%20Verified)-success.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Project Overview & Context

**EcoNext** is an enterprise-grade, sustainable AI-integrated retail platform and distributed e-commerce ecosystem developed as a **Final-Year Group Capstone Project**. 

The platform combines multi-modal artificial intelligence (computer vision similarity search, predictive price forecasting, TF-IDF natural language intent search, and LLM-grounded conversational commerce) with a high-throughput **Java 21 / Spring Boot 3.3.4 microservices architecture**, a **Spring Cloud API Gateway**, a dedicated **React 19 Admin & Staff Operations Portal**, and an event-driven **Big Data streaming & Hadoop HDFS Data Lake** ingestion layer.

### 👥 Capstone Project Team Members
* **Shiva Jinkalker** ([GitHub: @Jinkalkershiva](https://github.com/Jinkalkershiva))
* **RajputAtul75** ([GitHub: @RajputAtul75](https://github.com/RajputAtul75))

---

## 📑 Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Project Objectives](#2-project-objectives)
3. [Architectural Evolution: Monolith to Hybrid Microservices](#3-architectural-evolution-monolith-to-hybrid-microservices)
4. [Technology Stack Matrix](#4-technology-stack-matrix)
5. [System Architecture & Topology](#5-system-architecture--topology)
6. [Core Microservices & Bounded Contexts](#6-core-microservices--bounded-contexts)
7. [AI & Machine Learning Engineering](#7-ai--machine-learning-engineering)
8. [Big Data Streaming & Hadoop HDFS Data Lake](#8-big-data-streaming--hadoop-hdfs-data-lake)
9. [Admin & Staff Operational Management Portal](#9-admin--staff-operational-management-portal)
10. [Customer Storefront Experience](#10-customer-storefront-experience)
11. [Authentication, Security & RBAC / PBAC](#11-authentication-security--rbac--pbac)
12. [Database Design & Schemas](#12-database-design--schemas)
13. [API Route Matrix & Gateway Mapping](#13-api-route-matrix--gateway-mapping)
14. [Group Contributions & Git Engineering History](#14-group-contributions--git-engineering-history)
15. [Local Development Setup Guide](#15-local-development-setup-guide)
16. [Verification, Quality Assurance & Test Suites](#16-verification-quality-assurance--test-suites)
17. [Planned Enhancements & Future Scope](#17-planned-enhancements--future-scope)
18. [License & Acknowledgments](#18-license--acknowledgments)

---

## 1. Executive Summary & Problem Statement

### 1.1 The Real-World Problem
Traditional e-commerce platforms suffer from critical structural and usability shortcomings:
1. **Rigid Keyword-Based Search**: Customers often search with lifestyle intents (e.g., *"beach vacation"*, *"home office setup"*, *"marathon training"*) rather than exact SKU names. Traditional exact-match SQL search fails on semantic phrasing.
2. **Visual Discovery Barrier**: Users frequently have a photo or screenshot of a product they admire but lack the terminology to describe it textually.
3. **Price Volatility & Buyer Hesitation**: E-commerce prices fluctuate dynamically. Shoppers experience hesitation and buyer remorse, wondering whether to purchase immediately or wait for an impending price drop.
4. **Lack of Sustainability Visibility**: Modern eco-conscious consumers struggle to identify environmentally responsible products, organic materials, and carbon-conscious supply chains due to greenwashing and missing standardized sustainability metrics.
5. **Monolithic Bottlenecks & Operational Opacity**: Tightly coupled monoliths present single points of failure, lack granular role-based operational security for administrative staff, and obscure the multi-stage lifecycle of order fulfillment.
6. **Telemetry & Clickstream Data Silos**: Customer behavior, search drop-offs, and conversion analytics are often lost or siloed in relational databases rather than ingested in real time into analytical data lakes for predictive intelligence.

### 1.2 How EcoNext Addresses the Problem

```
+------------------------------------+---------------------------------------------------------------+
| Identified Problem                 | EcoNext Technical Solution                                    |
+------------------------------------+---------------------------------------------------------------+
| Semantic Search Friction           | TF-IDF vector space semantic matching with cosine similarity  |
| Image-Based Product Discovery      | Multi-Modal Visual Search (OpenAI CLIP ViT + 3D HSV Fallback) |
| Dynamic Price Uncertainty          | Scikit-learn Linear Regression "Buy or Wait" 7-day predictor  |
| Sustainable Retail Transparency    | Quantitative Sustainability Scores & EcoTag filtering         |
| Conversational Shopping Assistance | Context-Grounded Google Gemini AI Copilot (No hallucinations) |
| Scalability & Domain Isolation     | Java 21 Spring Boot Microservices + Spring Cloud Gateway      |
| Staff Governance & Auditing        | Granular RBAC/PBAC Admin Portal with forensic audit logging   |
| Real-Time Big Data Telemetry       | Apache Kafka KRaft + PySpark Streaming + Hadoop HDFS Data Lake|
+------------------------------------+---------------------------------------------------------------+
```

---

## 2. Project Objectives

The primary engineering objectives of this final-year project are:
* **Deliver Intelligent Product Discovery**: Implement multi-modal AI search allowing customers to query using images (CLIP ViT-B/32 & color histograms) or natural language intents (TF-IDF vectorizer).
* **Provide Algorithmic Shopping Intelligence**: Build an interpretable 60-day historical price forecasting engine projecting 7-day price trajectories with explicit "Buy Now" or "Wait" recommendation confidence scores.
* **Integrate Guardrailed Generative AI**: Deploy a context-grounded shopping chatbot assistant using Google Gemini, grounded strictly on real database inventory to eliminate hallucinations.
* **Architect a Scalable Microservices Ecosystem**: Decouple business domains into independent Spring Boot microservices with Spring Cloud Gateway routing, stateless JWT security, and domain-owned MySQL database clusters.
* **Implement Role-Based Governance (RBAC/PBAC)**: Develop a secure, dedicated operational administration portal enabling fine-grained access control across catalog managers, inventory handlers, order dispatchers, and analysts.
* **Construct a Big Data Streaming Pipeline**: Stream real-time telemetry (searches, impressions, cart events, orders) through Apache Kafka KRaft brokers into an Apache Hadoop HDFS Data Lake via PySpark Structured Streaming.

---

## 3. Architectural Evolution: Monolith to Hybrid Microservices

The repository reflects a structured, practical engineering evolution from an initial monolithic baseline to a scalable, distributed enterprise system:

```
+-----------------------------------------------------------------------------------+
|                            ARCHITECTURAL EVOLUTION                                |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  Stage 1: Monolithic Application Baseline                                          |
|  - Django 5.1 Monolith with SQLite / MySQL                                        |
|  - Django REST Framework (DRF) 3.15 API endpoints                                 |
|  - Single-Page Application (SPA) in React 18                                      |
|  - Core e-commerce models (Products, Accounts, Cart, Orders, Site Analytics)     |
|                                         │                                         |
|                                         ▼                                         |
|  Stage 2: Modularization & Feature Expansion                                       |
|  - Personalization Engine (User preferences, age groups, gender categories)       |
|  - Dedicated Segment routing (Kids Mode, Teens, Men, Women, Unisex)               |
|  - Redis 7 OTP verification & password reset workflows                            |
|  - Razorpay payment gateway integration & asynchronous notifications              |
|  - Frontend visual modernization (React 19 + Vite 6 + 3-Theme Design Tokens)      |
|                                         │                                         |
|                                         ▼                                         |
|  Stage 3: AI-Integrated E-Commerce Functionality                                  |
|  - Visual Search Engine (OpenAI CLIP ViT-B/32, FAISS index, 3D Color Histograms)  |
|  - "Buy or Wait" Price Predictor (Scikit-learn Linear Regression on PriceHistory) |
|  - Intent-based Semantic Search (TF-IDF Vectorizer + Cosine Similarity)           |
|  - Google Gemini AI Shopping Assistant with real-time catalog grounding           |
|                                         │                                         |
|                                         ▼                                         |
|  Stage 4: Administrative Management & RBAC / PBAC Governance                      |
|  - Dedicated React 19 Admin & Staff Portal (`admin-frontend`)                     |
|  - Spring Security RBAC / PBAC (`ROLE_ADMIN`, `ROLE_CATALOG_STAFF`, etc.)         |
|  - 10-Stage sequential Order Fulfillment State Machine                            |
|  - Forensic audit logging and bulk Excel/CSV ingestion (Apache POI, OpenCSV)      |
|                                         │                                         |
|                                         ▼                                         |
|  Stage 5: Current Implemented System (Hybrid Microservices & Big Data Ingestion)  |
|  - Java 21 / Spring Boot 3.3.4 multi-module microservice suite                    |
|  - Spring Cloud Gateway (Netty, Port 8080) routing with fallback bridge to Django |
|  - Multi-database MySQL 8.0 cluster (separate database per bounded context)       |
|  - Apache Kafka KRaft mode (Port 9092) streaming 5 domain event topics            |
|  - PySpark Structured Streaming & Batch Analytics Pipelines                       |
|  - Apache Hadoop HDFS Data Lake (`hdfs://localhost:9000/econext/`)                |
+-----------------------------------------------------------------------------------+
```

> [!NOTE]
> **Architecture Clarification**: Rather than discarding the mature AI engine, the platform implements a **Strangler Fig / Hybrid Bridge Architecture**. Spring Cloud Gateway sits at the edge (:8080). Operational domains (Auth, Catalog Ops, Cart, Orders, Admin/Staff, Payments, Ingestion) are handled by dedicated Spring Boot microservices, while AI inference and legacy endpoints seamlessly route to the Python Django backend (:8000).

---

## 4. Technology Stack Matrix

| Layer | Technology | Purpose & Description |
| :--- | :--- | :--- |
| **Customer Frontend** | React 19.2.3, Vite 6.2.0 | High-performance SPA with component-based state, Framer Motion transitions, and React Toastify notifications. |
| **Storefront Styling** | CSS Modules & Design Tokens | 3-Theme System (*Eco Mint*, *Clean White*, *Dark Carbon*) adhering to strict accessibility contrast standards. |
| **Admin Frontend** | React 19, Vite, Axios | Dedicated operational portal with interactive Theme Lamp toggle, role-aware sidebar, and data tables. |
| **Edge API Gateway** | Spring Cloud Gateway (Netty) | Non-blocking reactive edge proxy (Port 8080) providing centralized routing, CORS handling, and fallback bridging. |
| **Microservices Backend** | Java 21 LTS, Spring Boot 3.3.4 | Multi-module enterprise microservices utilizing Spring Data JPA, Spring Security 6, and Hibernate ORM. |
| **Core Monolith & AI** | Python 3.11+ / 3.13, Django 5.1.6 | REST API framework (DRF 3.15), ML model hosting, and catalog synchronization. |
| **Relational Database** | MySQL 8.0 (Community Server) | Domain-isolated schemas (`econext`, `econext_auth_db`, `econext_cart_db`, `econext_order_db`, `econext_payment_db`, `econext_notification_db`, `econext_analytics_db`). |
| **Dev Database Fallback** | SQLite 3 | Zero-configuration local development persistence fallback for the Django application. |
| **In-Memory Cache & OTP** | Redis 7 (Alpine) | Distributed TTL cache, rate limiting, and OTP password-reset verification store. |
| **Visual Search AI** | OpenAI CLIP (`ViT-B/32`) & FAISS | 512-dimensional vector embedding visual similarity retrieval with 3D HSV/RGB color histogram fallback. |
| **Predictive AI** | Scikit-learn (Linear Regression) | 60-day historical time-series price trajectory predictor outputting 7-day forecasts and buy/wait recommendations. |
| **Intent Search NLP** | Scikit-learn (TF-IDF Vectorizer) | Natural language lifestyle query transformation and cosine similarity catalog retrieval. |
| **Conversational AI** | Google Gemini (via OpenAI API bridge) | Context-aware shopping assistant grounded with real database candidate products. |
| **Automated Tagger** | Scikit-learn (Multinomial Naive Bayes) | Supervised classification of product metadata into age groups and gender categories. |
| **Event Broker** | Apache Kafka 3.7 (KRaft Mode) | Distributed event streaming broker operating without ZooKeeper across 5 high-throughput topics. |
| **Stream Processing** | Apache Spark 3.5 (PySpark) | Structured Streaming pipeline reading Kafka topics and checkpointing date-partitioned Parquet files to HDFS. |
| **Distributed Data Lake** | Apache Hadoop 3.x (HDFS) | Multi-tier analytical storage lake (`/econext/raw/`, `/econext/processed/`, `/econext/analytics/`). |
| **Data Ingestion** | Apache POI 5.3, OpenCSV 5.9 | High-performance batch parser for Excel (`.xlsx`, `.xls`) and CSV product catalog uploads. |
| **Payment Gateway** | Razorpay SDK (REST API) | Order creation, payment verification, and webhook handling. |
| **Authentication** | JJWT 0.12.6 / SimpleJWT | Stateless HMAC-SHA256 JWT access (24h) and refresh (7d) token security. |
| **Containerization** | Docker & Docker Compose | Containerized infrastructure for MySQL 8, Redis 7, Kafka KRaft, and Kafka-UI. |
| **Build Automation** | Maven 3.9+ & npm | Multi-module Java lifecycle management and Node package compilation. |
| **Version Control** | Git & GitHub | Collaborative version control, feature branching, and commit history tracking. |

---

## 5. System Architecture & Topology

### 5.1 Platform Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer["Client & UI Layer"]
        CustomerStore["Customer Storefront<br/>(React 19 / Vite - Port 3000)"]
        AdminPortal["Admin & Staff Portal<br/>(React 19 / Vite - Port 5174)"]
    end

    subgraph EdgeLayer["Edge & Ingress Layer"]
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
        VisualSearchEngine["CLIP ViT / HSV Color Search"]
        PricePredictor["Linear Regression Price Forecaster"]
        IntentSearch["TF-IDF Intent Search"]
        GeminiCopilot["Google Gemini AI Assistant"]
    end

    subgraph PersistenceLayer["Databases & Caches"]
        MySQLCluster[("MySQL 8.0 Cluster<br/>(Multi-DB Isolation)")]
        RedisCache[("Redis 7<br/>(Cache & OTP Store)")]
    end

    subgraph BigDataLayer["Big Data & Streaming Layer"]
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

---

## 6. Core Microservices & Bounded Contexts

Each microservice in the `microservices/` directory is built as an independent Maven module under a unified parent POM (`com.econext:econext-parent:1.0.0-SNAPSHOT`):

| Microservice Module | Port | Bounded Context & Responsibilities | Dedicated Database |
| :--- | :--- | :--- | :--- |
| **`api-gateway`** | `8080` | Dynamic edge routing, CORS policy enforcement, reactive Netty request forwarding, actuator health monitoring. | *Stateless* |
| **`auth-service`** | `8081` | Customer registration, login, JJWT token issuance, claims validation, BCrypt password encryption. | `econext_auth_db` |
| **`catalog-operations-service`** | `8082` | Product CRUD, category hierarchy, SKU stock ledger, inventory threshold alerts, sustainability score persistence. | `econext_product_db` |
| **`cart-service`** | `8083` | Stateful customer cart management, item quantity mutations, subtotal calculation, checkout handoff. | `econext_cart_db` |
| **`order-operations-service`** | `8084` | 10-stage sequential order state machine, shipping address binding, carrier tracking code dispatch. | `econext_order_db` |
| **`admin-staff-service`** | `8085` | Staff account lifecycle, RBAC/PBAC capability matrix, security profile governance, forensic audit logging. | `econext_auth_db` |
| **`data-import-analysis-service`** | `8086` | Multi-format catalog ingestion (Apache POI Excel, OpenCSV), live data sources engine, Big Data Kafka telemetry metrics. | `econext_analytics_db` |
| **`payment-service`** | `8087` | Razorpay checkout order generation, signature verification, payment status webhooks, Kafka payment events. | `econext_payment_db` |
| **`notification-service`** | `8089` | Asynchronous Kafka event listener, email/SMS notification dispatch simulation, customer alert tracking. | `econext_notification_db` |

### 6.1 Order Fulfillment 10-Stage State Machine

The `order-operations-service` enforces a sequential, validated state machine to guarantee fulfillment integrity:

```mermaid
stateDiagram-v2
    [*] --> ORDER_PLACED: Checkout Completed
    ORDER_PLACED --> ORDER_CONFIRMED: Payment Verified
    ORDER_CONFIRMED --> PROCESSING: Warehouse Allocation
    PROCESSING --> PACKED: Items Boxed & Labelled
    PACKED --> SHIPPED: Handed to Logistics Carrier
    SHIPPED --> IN_TRANSIT: In Transit Between Hubs
    IN_TRANSIT --> OUT_FOR_DELIVERY: Local Courier Dispatch
    OUT_FOR_DELIVERY --> DELIVERED: Customer Delivery Confirmed
    DELIVERED --> RETURN_REQUESTED: Customer Initiates Return
    RETURN_REQUESTED --> RETURNED: Inspection & Restock Complete
    DELIVERED --> [*]
    RETURNED --> [*]
```

---

## 7. AI & Machine Learning Engineering

All AI and Machine Learning components are located in `backend/ml_engine/` and `backend/copilot/`, designed with fallback safety mechanisms:

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

### 7.1 "Buy or Wait" Price Predictor (`price_predictor.py`)
* **Algorithm**: Ordinary Least Squares (OLS) Linear Regression with forward-fill interpolation for missing calendar dates.
* **Input Dataset**: Up to 60 days of historical `PriceHistory` records.
* **Output**:
  * 7-day projected future price trajectory.
  * Trend direction (`upward`, `downward`, `stable`).
  * Volatility metric (standard deviation of historical price fluctuations).
  * Confidence score ($R^2$ coefficient of determination).
  * Actionable Recommendation:
    * 🟢 **"Best Price" (Buy Now)**: Average projected 7-day price increases by $> +5\%$.
    * 🟡 **"Wait"**: Average projected 7-day price decreases by $< -5\%$.
    * ⚪ **"Neutral"**: Predicted change remains within $[-5\%, +5\%]$.

### 7.2 Multi-Modal Visual Search (`visual_search.py`)
* **Primary Engine**: OpenAI CLIP (`openai/clip-vit-base-patch32`) extracting 512-dimensional vector embeddings, indexed using Facebook AI Similarity Search (FAISS) for sub-millisecond retrieval.
* **Resilient Color-Histogram Fallback**: When heavy PyTorch/CUDA dependencies are unavailable, the engine executes an $8 \times 8 \times 8 = 512$ bin $L_2$-normalized 3D HSV/RGB color histogram computed with NumPy and compares images via OpenCV-compatible Chi-Square distance ($\chi^2$).
* **Lazy Initialization**: Models load on first search request rather than boot time, preventing database race conditions during migrations.

### 7.3 Intent-Based Semantic Search (`intent_search.py`)
* **Algorithm**: TF-IDF (Term Frequency-Inverse Document Frequency) vectorizer with unigram and bigram tokenization (`ngram_range=(1, 2)`), excluding English stop words.
* **Mechanism**: Maps unstructured lifestyle queries (e.g., *"beach trip"*, *"gym workout"*, *"office meeting"*) across product names, categories, tags, and descriptions.
* **In-Memory Cache**: The sparse TF-IDF matrix is cached in memory and recalculated only when product table modification timestamps change.

### 7.4 Grounded Google Gemini AI Copilot (`chat_service.py`)
* **Two-Pass Grounding Pipeline**:
  1. **Pass 1 (Intent Extraction)**: Parses user natural language query to identify category, budget range, and desired eco-features.
  2. **Pass 2 (Candidate Grounding & Selection)**: Queries the database for matching products and injects up to 8 candidate specifications into the Gemini prompt context.
* **Strict Guardrails**: Explicit system instructions forbid hallucinating non-existent inventory, prices, or technical specifications.

---

## 8. Big Data Streaming & Hadoop HDFS Data Lake

EcoNext integrates an enterprise event-driven Big Data telemetry pipeline to capture, stream, and archive high-volume e-commerce clickstream data.

```
+----------------------------------------------------------------------------------------------------+
|                               BIG DATA STREAMING & DATA LAKE PIPELINE                              |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [ Django & Spring Microservices ]                                                                 |
|         │                                                                                          |
|         ├──> user-search-events     (Clickstream search terms, category filters)                  |
|         ├──> product-view-events    (Impression durations, product IDs)                            |
|         ├──> cart-events            (Cart item additions, quantity mutations)                     |
|         ├──> order-events           (Checkout totals, order status transitions)                   |
|         └──> inventory-events       (Stock updates, restock warnings)                              |
|                                                                                                    |
|                                    │ (Non-blocking async producer)                                 |
|                                    ▼                                                               |
|                   [ Apache Kafka KRaft Broker (:9092) ]                                            |
|                                    │                                                               |
|                                    ▼                                                               |
|                 [ PySpark Structured Streaming Engine ]                                            |
|                 (scripts/spark/spark_stream_kafka_to_hdfs.py)                                       |
|                                    │                                                               |
|                                    ▼ (Date-partitioned Parquet files)                             |
|              [ Apache Hadoop HDFS Data Lake: hdfs://localhost:9000/econext/ ]                      |
|                     ├── /raw/       (Event streams partitioned by year/month/day)                  |
|                     ├── /processed/ (Snappy-compressed columnar fact datasets)                    |
|                     └── /analytics/ (Aggregated daily trends & demand forecasts)                  |
+----------------------------------------------------------------------------------------------------+
```

### 8.1 Kafka Event Ingestion Topics
1. `user-search-events`: Captures customer queries, result counts, and timestamped session IDs.
2. `product-view-events`: Logs product detail impressions and view durations.
3. `cart-events`: Records items added, updated, or removed from shopping carts.
4. `order-events`: Emits order lifecycle status transitions and transaction totals.
5. `inventory-events`: Publishes inventory ledger adjustments and low-stock alerts.

### 8.2 Spark Ingestion & Compaction Scripts
* **Streaming Ingestion** (`scripts/spark/spark_stream_kafka_to_hdfs.py`): Ingests all 5 Kafka topics via PySpark Structured Streaming with a 10-second trigger interval and writes partitioned Parquet files to `hdfs://localhost:9000/econext/raw/<topic_name>/year=YYYY/month=MM/day=DD/`.
* **Batch Analytics** (`scripts/spark/spark_batch_analytics.py`): Computes search trend aggregations, zero-result search gaps, and sustainability conversion lift correlations.

---

## 9. Admin & Staff Operational Management Portal

The platform provides a dedicated operational management dashboard located in `admin-frontend/` (built with **React 19** and **Vite 6**):

### 9.1 UI & Design Token Architecture
* **Design Philosophy**: High-contrast, clean visual surfaces with zero glassmorphism, 1px graphite borders, and clear semantic status indicators.
* **Design Tokens**:
  * **Pink (`#f43f5e`)**: Primary interactive highlights, active route badges, key action triggers.
  * **Yellow (`#eab308`)**: Operational alerts, pending orders, low-stock threshold warnings.
  * **Green (`#10b981`)**: Success confirmations, completed orders, healthy microservice nodes.
  * **Graphite / Slate (`#1e293b` to `#64748b`)**: Typography, tables, headers, and structural chrome.
* **Theme Lamp Toggle**: Custom animated desk-lamp theme switch with dynamic light cone effect, persisting selection in `localStorage`.
* **Password Eye Toggle**: Accessible password visibility toggle on login forms with full keyboard navigation and focus rings.

### 9.2 Operational Dashboard Modules
* **Dashboard Overview**: Microservice cluster health indicators, total revenue, active orders, and low-stock counters.
* **Product Catalog Management**: Create, edit, and delete catalog items, adjust sustainability ratings, and assign eco-tags.
* **Inventory Stock Ledger**: Real-time stock level monitoring with instant threshold adjustment modals.
* **Order Operations & Fulfillment**: Visual 10-stage sequential state updater with carrier tracking number entry.
* **Bulk Import Wizard**: Upload and validate product datasets via CSV and Excel (`.xlsx`, `.xls`) powered by Apache POI and OpenCSV.
* **Live Sources Engine**: Toggle and monitor live external inventory integration pipelines.
* **Big Data Telemetry**: Real-time Kafka topic monitor, consumer group lag inspection, and HDFS Lake storage metrics.
* **Staff & RBAC Governance**: Create staff accounts, assign granular role permissions, and view immutable forensic audit logs.

---

## 10. Customer Storefront Experience

The customer storefront in `frontend/` provides a modern, responsive single-page retail experience:

* **3-Theme System**: Dynamic switching between *Eco Mint* (sustainable emerald accents), *Clean White* (minimalist high-contrast light mode), and *Dark Carbon* (graphite dark mode).
* **Segment-Based Navigation**: Dedicated shopping pages for **Kids Mode**, **Teens**, **Men**, **Women**, and **Unisex**.
* **Visual Search Dropzone**: Drag-and-drop image search modal with instant similarity matching.
* **Interactive Price Prediction Cards**: Product detail pages display 7-day price forecasts with historical price trend graphs.
* **AI Copilot Floating Assistant**: Interactive shopping assistant widget with natural conversation flow and direct product card recommendations.
* **Personalized Preference Wizard**: Onboarding questionnaire capturing user style preferences, fit requirements, and eco-priorities.
* **Shopping Cart & Checkout**: Interactive slide-out cart drawer and multi-step checkout with Razorpay integration.

---

## 11. Authentication, Security & RBAC / PBAC

EcoNext enforces enterprise security standards across both customer and administrative domains:

```
+-----------------------------------------------------------------------------------+
|                        SECURITY & ACCESS CONTROL TOPOLOGY                         |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Customer Storefront ]                       [ Admin & Staff Portal ]           |
|            │                                              │                       |
|            ▼                                              ▼                       |
|  [ JWT Stateless Auth ]                        [ Spring Security 6 RBAC ]         |
|  - 24-Hour Access Token                        - BCrypt Hashing (Strength 12)     |
|  - 7-Day Refresh Token                         - Strict Role-Permission Mapping   |
|  - Redis OTP Password Reset                    - Forensic Audit Trail Logging     |
+-----------------------------------------------------------------------------------+
```

### 11.1 Role-Based Access Control (RBAC) Matrix

| System Role | Granted Permissions / Capabilities | Permitted Portal Modules |
| :--- | :--- | :--- |
| **`ROLE_ADMIN`** | `ALL_PERMISSIONS` (Full Platform Governance) | Dashboard, Products, Inventory, Orders, Import Wizard, Live Sources, Big Data, Staff, Roles, Audit Logs |
| **`ROLE_CATALOG_STAFF`** | `CATALOG_VIEW`, `CATALOG_CREATE`, `CATALOG_EDIT`, `INVENTORY_VIEW` | Products, Categories, Inventory View |
| **`ROLE_INVENTORY_STAFF`**| `INVENTORY_VIEW`, `INVENTORY_ADJUST`, `CATALOG_VIEW` | Inventory Ledger, Stock Adjustments |
| **`ROLE_ORDER_STAFF`** | `ORDER_VIEW`, `ORDER_STATUS_UPDATE`, `ORDER_TRACKING_ADD` | Orders Management, Fulfillment State Machine |
| **`ROLE_ANALYTICS_STAFF`**| `ANALYTICS_VIEW`, `DATA_ANALYSIS`, `DATA_IMPORT` | Analytics, Big Data Telemetry, Bulk Import Wizard |

### 11.2 Forensic Audit Trail
Every privileged operational action (staff creation, role modification, product deletion, stock adjustment, order state transition) is captured in an immutable audit table storing:
* `timestamp`: UTC ISO timestamp.
* `username`: Staff actor email or username.
* `action`: Action identifier (e.g., `UPDATE_ORDER_STATUS`, `ADJUST_STOCK`).
* `targetDomain`: Bounded context (e.g., `ORDER`, `INVENTORY`).
* `details`: JSON payload capturing prior state vs. updated state.
* `clientIp`: Ingress client IP address.

---

## 12. Database Design & Schemas

The platform maintains strict domain ownership across its MySQL 8.0 cluster:

```
MySQL 8.0 Multi-Database Cluster
├── econext                     # Django monolithic catalog, accounts & ML cache
├── econext_auth_db             # Spring auth-service & admin-staff-service tables
├── econext_product_db          # Spring catalog-operations-service tables
├── econext_cart_db             # Spring cart-service tables
├── econext_order_db            # Spring order-operations-service tables
├── econext_payment_db          # Spring payment-service tables
├── econext_notification_db     # Spring notification-service tables
└── econext_analytics_db        # Spring data-import & telemetry tables
```

### 12.1 Core Relational Models Summary

```mermaid
erDiagram
    CATEGORY ||--o{ PRODUCT : contains
    CATEGORY ||--o{ SUBCATEGORY : has
    PRODUCT ||--o{ PRICE_HISTORY : tracks
    PRODUCT ||--o{ PRODUCT_VIEW : logs
    PRODUCT ||--o{ PRODUCT_SEARCH : records
    USER ||--|| USER_PROFILE : owns
    USER ||--|| USER_PREFERENCE : configures
    USER ||--|| CART : maintains
    CART ||--o{ CART_ITEM : holds
    PRODUCT ||--o{ CART_ITEM : references
    USER ||--o{ ORDER : places
    ORDER ||--o{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : includes
    ORDER ||--o{ ORDER_TRACKING : tracks
    ORDER ||--o{ PAYMENT : settles
    STAFF_USER ||--o{ ROLE : assigned
    ROLE ||--o{ PERMISSION : grants
    STAFF_USER ||--o{ AUDIT_LOG : generates
```

* **`Product`**: `id`, `name`, `description`, `current_price`, `stock`, `sustainability_score`, `popularity_score`, `tags` (JSON), `image_features` (JSON), `category_id`, `subcategory_id`, `season_id`, `occasion_id`, `skin_or_body_fit_id`.
* **`PriceHistory`**: `id`, `product_id`, `price`, `date` (Unique together: `[product, date]`).
* **`UserPreference`**: `user_id`, `age_group_id`, `gender_category_id`, `budget_min`, `budget_max`, `color_preferences` (JSON), `style_preferences` (JSON).
* **`Cart` & `CartItem`**: `id`, `user_id`, `product_id`, `quantity`, `added_at`.
* **`Order` & `OrderItem`**: `id`, `user_id`, `status` (10 stages), `total_price`, `shipping_address`, `city`, `state`, `zipcode`, `country`.
* **`Payment`**: `id`, `order_id`, `user_id`, `razorpay_order_id`, `razorpay_payment_id`, `amount`, `status`, `payment_method`.
* **`AuditLog`**: `id`, `username`, `role`, `action`, `resource_type`, `resource_id`, `details` (JSON), `ip_address`, `timestamp`.

---

## 13. API Route Matrix & Gateway Mapping

All external traffic routes through the Spring Cloud Gateway on port `8080`:

| Ingress Route Pattern | Target Destination | Method(s) | Functionality |
| :--- | :--- | :--- | :--- |
| `/api/auth/**` | `auth-service` (`:8081`) | ALL | Customer signup, login, JWT token issuance |
| `/api/admin/auth/login` | `admin-staff-service` (`:8085`) | POST | Admin & Staff credential authentication |
| `/api/admin/auth/me` | `admin-staff-service` (`:8085`) | GET | Authenticated staff profile & capability list |
| `/api/admin/staff/**` | `admin-staff-service` (`:8085`) | ALL | Staff account governance & role assignment |
| `/api/admin/audit/**` | `admin-staff-service` (`:8085`) | GET | Forensic audit trail logs |
| `/api/catalog-ops/**` | `catalog-operations-service` (`:8082`) | ALL | Operational product & category CRUD |
| `/api/inventory-ops/**`| `catalog-operations-service` (`:8082`) | ALL | Inventory stock ledger adjustments & alerts |
| `/api/cart/**` | `cart-service` (`:8083`) | ALL | Shopping cart lifecycle & item mutations |
| `/api/order-ops/**` | `order-operations-service` (`:8084`) | ALL | 10-stage sequential order transitions |
| `/api/payments/**` | `payment-service` (`:8087`) | ALL | Razorpay checkout creation & verification |
| `/api/notifications/**`| `notification-service` (`:8089`) | ALL | Notification stream & customer alerts |
| `/api/import/**` | `data-import-analysis-service` (`:8086`)| POST | Bulk Excel/CSV product dataset ingestion |
| `/api/analytics/big-data/**`| `data-import-analysis-service` (`:8086`)| GET | Real-time Kafka telemetry & HDFS Lake metrics |
| `/api/products/search/visual/` | `backend` (`:8000`) | POST | CLIP / HSV image visual search |
| `/api/products/search/intent/` | `backend` (`:8000`) | GET | TF-IDF natural language intent search |
| `/api/products/<id>/prediction/`| `backend` (`:8000`) | GET | Scikit-learn 7-day price forecast |
| `/api/chat/`, `/api/copilot/` | `backend` (`:8000`) | POST | Google Gemini grounded conversational AI |
| `/api/**` *(Fallback)* | `backend` (`:8000`) | ALL | Monolithic Django endpoints & accounts |

---

## 14. Group Contributions & Git Engineering History

This project was built collaboratively by a 2-person engineering team. The repository commit history reflects clear task distribution:

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

## 15. Local Development Setup Guide

### 15.1 Prerequisites
* **Java**: OpenJDK 21 LTS (`java -version`)
* **Maven**: Apache Maven 3.9+ (`mvn -version`)
* **Python**: Python 3.11+ or 3.13 (`python --version`)
* **Node.js**: Node.js 18+ or 20+ & npm (`node -v`, `npm -v`)
* **Docker**: Docker Desktop with Docker Compose (`docker compose version`)

---

### 15.2 Step 1: Start Infrastructure (Docker)
Launch the MySQL 8.0 cluster, Redis 7, Apache Kafka KRaft broker, and Kafka UI:

```bash
# Navigate to microservices docker configuration
cd microservices
docker compose up -d

# Verify running containers
docker compose ps
```

* **Kafka UI Dashboard**: Accessible at `http://localhost:8088/`
* **MySQL Port**: `localhost:3306`
* **Redis Port**: `localhost:6379`
* **Kafka Broker Port**: `localhost:9092`

---

### 15.3 Step 2: Run Python Django Backend & AI Engine
The Django backend runs the ML models, price predictor, visual search, and copilot:

```bash
cd ../backend

# Create and activate Python virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Seed sample price history and catalog data
python seed_price_history.py

# Start Django Development Server (Port 8000)
python manage.py runserver 127.0.0.1:8000
```

---

### 15.4 Step 3: Compile and Run Java Spring Boot Microservices
Build the multi-module Maven project and run key microservices:

```bash
cd ../microservices

# Build all 10 modules
mvn clean compile

# Run services in separate terminal sessions:
# 1. Edge Gateway (Port 8080)
mvn spring-boot:run -pl api-gateway

# 2. Admin & Staff Service (Port 8085)
mvn spring-boot:run -pl admin-staff-service

# 3. Catalog Operations Service (Port 8082)
mvn spring-boot:run -pl catalog-operations-service

# 4. Cart Service (Port 8083)
mvn spring-boot:run -pl cart-service

# 5. Order Operations Service (Port 8084)
mvn spring-boot:run -pl order-operations-service

# 6. Data Import & Analytics Service (Port 8086)
mvn spring-boot:run -pl data-import-analysis-service
```

---

### 15.5 Step 4: Run React 19 Admin & Staff Portal
```bash
cd ../admin-frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
* **Admin Portal URL**: `http://localhost:5174/`
* **Default Admin Credentials**: Configured via environment variables (`ADMIN_INITIAL_USERNAME=admin`, `ADMIN_INITIAL_PASSWORD=Admin@12345`).

---

### 15.6 Step 5: Run Customer Storefront
```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
* **Customer Storefront URL**: `http://localhost:3000/`

---

### 15.7 Step 6: Execute Big Data Streaming Pipeline (Optional)
To test Kafka-to-HDFS streaming and Spark batch analytics:

```bash
cd ../scripts/spark

# 1. Start Real-time Kafka-to-HDFS Structured Streaming
python spark_stream_kafka_to_hdfs.py

# 2. Run Batch Compaction & Analytics Job
python spark_batch_analytics.py
```

---

## 16. Verification, Quality Assurance & Test Suites

The entire platform includes automated unit and integration tests across both the Java microservices suite and the Python Django monolith:

```bash
# ==============================================================================
# 1. Java Microservices Multi-Module Test Suite (All 10 Modules)
# ==============================================================================
cd microservices
mvn test

# ==============================================================================
# 2. Django Backend Monolith Test Suite
# ==============================================================================
cd ../backend
python manage.py test

# ==============================================================================
# 3. Admin Frontend Production Bundle Verification
# ==============================================================================
cd ../admin-frontend
npm run build

# ==============================================================================
# 4. Customer Storefront Production Bundle Verification
# ==============================================================================
cd ../frontend
npm run build
```

### Verified Test Results Summary
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
 [✓] Django Backend Monolith Tests:          9 / 9 Tests Passed (OK in 8.3s)
 [✓] Admin Frontend Production Build:        Compiled Cleanly with Vite (0 Errors)
 [✓] Customer Storefront Build:              Compiled Cleanly with Vite (0 Errors)
 [✓] Apache Kafka KRaft Ingestion Topics:     5 / 5 Topics Initialized & Verified
 [✓] Real Spring Boot Security Auth:         Verified with BCrypt & Stateless JWT
========================================================================================
```

---

## 17. Planned Enhancements & Future Scope

While the current implemented system is fully functional, the following items are identified as **Planned / Future Enhancements**:
* **Distributed Elasticsearch / OpenSearch Integration**: Transitioning TF-IDF in-memory intent search to a dedicated distributed Elasticsearch cluster.
* **Apache Flink Real-Time Complex Event Processing (CEP)**: Implementing sub-second fraud detection on payment events and anomalous purchase patterns.
* **Multi-Cloud Kubernetes Deployment (EKS / GKE)**: Container orchestration with Helm charts and automated horizontal pod autoscaling (HPA).
* **Advanced Neural Collaborative Filtering (NCF)**: Deep-learning-based recommendation engine incorporating real-time user session graphs.
* **Dynamic Automated Price Elasticity Modeling**: Reinforcement learning agents for automated merchant pricing optimization based on demand elasticity.

---

## 18. License & Acknowledgments

### 18.1 License
This project is open-source software licensed under the **[MIT License](LICENSE)**.

### 18.2 Academic Acknowledgments
Developed as a **Final-Year Group Capstone Project** in Computer Science & Engineering. We express our gratitude to our project advisors, faculty mentors, and the open-source community behind Spring Boot, Django, React, Apache Kafka, Apache Spark, and Google Gemini.
