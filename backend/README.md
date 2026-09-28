# EcoNext Backend & AI/ML Engine (`backend`)

[![Python](https://img.shields.io/badge/Python-3.11%2B%20%2F%203.13-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.1.6-darkgreen.svg?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.15-red.svg)](https://www.django-rest-framework.org/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.5-orange.svg)](https://scikit-learn.org/)
[![CLIP](https://img.shields.io/badge/OpenAI-CLIP%20ViT--B%2F32-blue.svg)](https://github.com/openai/CLIP)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini%20Copilot-yellow.svg)](https://ai.google.dev/)
[![Razorpay](https://img.shields.io/badge/Razorpay-HMAC--SHA256%20Verified-blue.svg)](https://razorpay.com/)

The **EcoNext Backend** is the core customer commerce platform, AI/ML intelligence engine, and payment verification service. Built on **Django 5.1.6** and **Django REST Framework (DRF)**, it powers the customer storefront experience, multi-modal search, predictive price forecasting, and Razorpay payment capture.

---

## 📌 Architectural Scope & Authority

```
+-----------------------------------------------------------------------+
|                    EcoNext Customer Storefront (:5073)                |
+-----------------------------------------------------------------------+
                                   │
                           HTTP / REST / JWT
                                   ▼
+-----------------------------------------------------------------------+
|             Django 5.1.6 REST Framework Monolith (:8000)              |
+-----------------------------------------------------------------------+
        │                 │                  │                │
 Customer Commerce   AI / ML Engine   Razorpay Verifier  Kafka Producer
 (Cart, Orders, Auth) (CLIP, Forecaster) (HMAC-SHA256)   (Clickstream)
        │                 │                  │                │
        ▼                 ▼                  ▼                ▼
   SQLite / MySQL    Scikit-learn       Razorpay SDK     Kafka KRaft
    (Customer DB)    (Saved Models)     (Test Mode)        (:9092)
```

### 1. Authoritative Domain Responsibilities
- **Customer Identity & Profiles**: User registration, customer login, password reset OTP, and user address management (`auth_user`, `accounts_userprofile`).
- **Product Catalog & Taxonomy**: Category hierarchies, eco-tags, sustainability scoring, product specifications, and price histories (`products`).
- **Customer Shopping Cart & Checkout**: Add/remove cart items, quantity adjustments, discount calculations (`shop_cart`).
- **Order Placement & Customer Tracking**: Customer order history, invoice retrieval, delivery timeline tracking (`order_service`).
- **AI / Machine Learning Pipelines**: Visual embedding similarity search, 7-day price forecasting, TF-IDF intent search, and Gemini Copilot.
- **Payment Signature Cryptography**: Server-side Razorpay order generation and constant-time HMAC-SHA256 payment signature verification.

### 2. Admin/Staff Authority Status (Legacy Compatibility)
- **Authoritative SSOT for Admin/Staff**: Spring Boot `admin-staff-service` (`:8085`) via Spring Cloud Gateway (`:8080`).
- **Django Staff Endpoints (`/api/accounts/staff-users/`, `/api/accounts/staff-roles/`)**: Maintained strictly for backward compatibility and marked as legacy. All active Admin UI operations target the Spring Boot backend directly.

---

## 🧠 AI & Machine Learning Subsystems

### 1. Multi-Modal Visual Search (`ml_engine/visual_search.py`)
- Extracts 512-dimensional feature embeddings from uploaded images using OpenAI's `clip-vit-base-patch32`.
- Performs vector similarity search across pre-computed catalog embeddings using Cosine Similarity.
- Provides a robust fallback utilizing an $8 \times 8 \times 8$ 3D HSV color histogram with Chi-Square distance scoring when GPU/CLIP dependencies are in lightweight mode.

### 2. Algorithmic Price Forecaster (`ml_engine/price_predictor.py`)
- Analyzes 60-day historical price time series (`PriceHistory` table).
- Fits Ordinary Least Squares (OLS) Linear Regression with trend projection over a 7-day horizon.
- Emits actionable buy/wait advice with an explicit confidence metric ($R^2$ score):
  - **"Buy Now"**: When the price trend indicates an upward trajectory.
  - **"Wait"**: When the price is projected to drop over the coming week.

### 3. Semantic Intent Search (`ml_engine/intent_search.py`)
- Leverages Scikit-learn's `TfidfVectorizer` to capture lifestyle intents (e.g., *"organic summer outfit"*, *"ergonomic home office"*).
- Computes cosine similarity between user query vectors and normalized product catalog descriptions.

### 4. EcoNext Copilot (`copilot/`)
- Conversational shopping assistant powered by Google Gemini.
- Uses a two-pass architecture:
  1. Extracts product search criteria from user dialogue.
  2. Queries the database for matching inventory candidates and injects them as grounding context into the prompt to prevent hallucinations.

---

## 💳 Razorpay Online Payment Flow & Zero Ghost Orders

1. **Order Creation (`/api/payments/create-order/`)**:
   - Backend calculates the exact order amount in **paise** ($₹1.00 = 100\text{ paise}$).
   - Creates a pending transaction record with `status='PENDING'`.
   - Generates a Razorpay Order ID via the Razorpay REST API.

2. **Signature Verification (`/api/payments/verify/`)**:
   - Computes expected HMAC-SHA256 signature using the secret key:
     $$\text{Signature} = \text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id},\ \text{RAZORPAY\_KEY\_SECRET})$$
   - Uses constant-time comparison to prevent timing attacks.

3. **Atomic Order Finalization (`/api/orders/create/`)**:
   - Re-verifies payment state before creating order records.
   - Decrements product inventory inside an atomic database transaction (`transaction.atomic()`).
   - Clears the user's shopping cart upon successful creation.
   - Zero pre-payment unconfirmed orders are created.

---

## 🛠️ Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
# Django Core Settings
SECRET_KEY=${DJANGO_SECRET_KEY}
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

# Database Configuration (Defaults to db.sqlite3 if omitted)
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3

# Razorpay Test Credentials
RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}

# Google Gemini / AI Copilot
GEMINI_API_KEY=${GEMINI_API_KEY}

# Apache Kafka Broker
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
```

> [!WARNING]
> Never commit active API keys, secrets, or passwords to Git. All secret variables should be populated locally or via your CI/CD secrets manager.

---

## 📦 Getting Started & Commands

### Prerequisites
- Python 3.11+ or 3.13
- Virtualenv (`python -m venv .venv`)

### Installation & Migrations
```bash
cd backend

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install required dependencies
pip install -r requirements.txt

# Run system verification
python manage.py check

# Apply database migrations
python manage.py migrate
```

### Running the Server
```bash
# Start Django development server on port 8000
python manage.py runserver 127.0.0.1:8000
```

### Running Tests
```bash
# Run unit & integration tests
python manage.py test
```

---

## 📁 Directory Structure

```
backend/
├── accounts/                 # Customer authentication & user profile management
│   ├── models.py             # UserProfile and address models
│   ├── auth_views.py         # Login, register, token, and legacy staff views
│   └── urls.py               # Account API routing
├── copilot/                  # Google Gemini conversational shopping assistant
│   ├── chat_service.py       # Dialogue handling and context grounding
│   └── prompts.py            # Guardrail system prompts
├── econext/                  # Django project root settings and URL dispatcher
│   ├── settings.py           # Core settings, CORS, JWT, and database configs
│   ├── urls.py               # Master API routing table
│   └── wsgi.py               # WSGI entry point
├── ml_engine/                # AI and machine learning service modules
│   ├── visual_search.py      # CLIP ViT + 3D HSV visual similarity
│   ├── price_predictor.py    # 60-day time-series OLS linear regressor
│   ├── intent_search.py      # TF-IDF natural language intent search
│   └── auto_tagger.py        # Multinomial Naive Bayes taxonomy tagger
├── order_service/            # Order fulfillment, shipment, and GPS tracking models
│   ├── models.py             # Order, OrderItem, Shipment, Container, LogisticsTrackingEvent
│   └── migrations/           # Database migration history
├── products/                 # Product catalog, categories, and sustainability tags
│   ├── models.py             # Product, Category, EcoTag, PriceHistory
│   └── views.py              # Catalog search, filter, and detail endpoints
├── shop_cart/                # Shopping cart, checkout, and payment capture
│   ├── models.py             # Cart and CartItem models
│   ├── payment_views.py      # Razorpay order creation and HMAC-SHA256 verification
│   └── views.py              # Cart CRUD and order placement views
├── site_analytics/           # Telemetry and Kafka producer
│   └── kafka_producer.py     # Asynchronous event publishing to Kafka KRaft
├── manage.py
└── requirements.txt
```
