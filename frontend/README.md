# EcoNext Customer Storefront (`frontend`)

[![React 19](https://img.shields.io/badge/React-19.2.3-cyan.svg?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4.3-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-12.0-blueviolet.svg)](https://www.framer.com/motion/)
[![Lucide Icons](https://img.shields.io/badge/Lucide-Icons-orange.svg)](https://lucide.dev/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Standard%20Checkout-blue.svg)](https://razorpay.com/)
[![STOMP WebSocket](https://img.shields.io/badge/WebSocket-STOMP%20%2F%20SockJS-blue.svg)]()

The **EcoNext Customer Storefront** is a modern, responsive Single-Page Application (SPA) designed to deliver an intelligent, sustainable, and multi-modal shopping experience to consumers. Built on **React 19** and bundled with **Vite**, it integrates real-time AI product discovery, predictive price forecasting, floating conversational assistance, and secure online payments.

---

## 📌 Architectural Scope

```
+-----------------------------------------------------------------------+
|                 EcoNext Customer Storefront (Port 5073)               |
+-----------------------------------------------------------------------+
            │                                             │
      HTTP / REST / JWT                             WebSocket / STOMP
            ▼                                             ▼
+-----------------------+                    +--------------------------+
|  Django Backend Core  |                    | order-operations-service |
|      (Port 8000)      |                    |       (Port 8084)        |
+-----------------------+                    +--------------------------+
 (Catalog, Cart, Auth,                        (/ws-tracking Live
  Visual Search, AI, Razorpay)                 Shipment & Order Updates)
```

---

## 🌟 Key Customer Features

### 1. Multi-Modal AI Product Discovery
- **Visual Search Modal**: Upload or drag-and-drop any product photo or screenshot to find visually similar items using 512-dimensional CLIP ViT embeddings and 3D HSV color similarity.
- **Natural Language Intent Search**: Search by lifestyle intents (e.g., *"eco-friendly morning run"*, *"minimalist office desk"*).
- **Automated Taxonomy Filtering**: Instant navigation across curated categories including **Kids Mode**, **Teens**, **Men**, **Women**, and **Unisex**.

### 2. Algorithmic Price Intelligence
- **7-Day Price Trajectory Graph**: Interactive historical price charts displaying the past 60 days of pricing alongside future trend predictions.
- **"Buy Now" vs "Wait" Advice**: Algorithmic recommendation with confidence metrics to help customers make optimal purchasing decisions.

### 3. EcoNext AI Shopping Copilot
- **Conversational Assistant**: Floating AI shopping companion powered by Google Gemini.
- **Database Grounding**: Product recommendations are strictly grounded in active store inventory, preventing hallucinated product attributes.

### 4. Real-Time Order & Physical Shipment Tracking
- **Live Fulfillment Stepper**: Visual 10-stage order fulfillment progress indicator.
- **Physical Shipment Tracking**: Displays assigned carrier, vehicle number, driver details, origin, destination, and live GPS coordinates.
- **WebSocket / STOMP Real-Time Updates**: Subscribes to `/topic/orders/{orderId}` and `/topic/shipments/{shipmentId}` via SockJS/STOMP for live delivery event streaming without page refreshes.

### 5. Seamless Razorpay Payment Experience
- **Razorpay Standard Checkout**: Integrated modal supporting UPI, Credit/Debit Cards, and NetBanking.
- **Zero Pre-Order Ghost Protection**: Strict client-server handshake ensuring orders are persisted only after server-side cryptographic signature verification.
- **Cash on Delivery (COD)**: Alternative frictionless checkout option.

### 6. Design System & Theming
- **3-Theme Color Engine**: Instant switching between:
  - 🌿 **Eco Mint** (Default sustainable green theme)
  - ⚪ **Clean White** (Minimalist modern light theme)
  - 🌑 **Dark Carbon** (High-contrast OLED dark theme)
- **Framer Motion Micro-Interactions**: Smooth page transitions, cart drawer slide-outs, and animated modal overlays.

---

## 🛠️ Environment Configuration

Create a `.env` file in the `frontend/` directory:

```env
# Backend API Base URL
VITE_API_URL=http://127.0.0.1:8000/api

# WebSocket / STOMP Real-Time Tracking URL
VITE_WS_URL=http://127.0.0.1:8084/ws-tracking

# Razorpay Public Key ID (Test Mode)
VITE_RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
```

> [!NOTE]
> Never hardcode Razorpay secret keys or sensitive credentials in the frontend. Public keys (`rzp_test_...`) are strictly read from environment variables.

---

## 📦 Getting Started & Scripts

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
# Starts customer storefront on port 5073
npm run dev -- --port 5073
```
Open [http://localhost:5073](http://localhost:5073) to view the storefront in your browser.

### Production Build
```bash
npm run build
```
Compiles and optimizes JavaScript/CSS bundles into the `dist/` directory.

### Production Preview
```bash
npm run preview -- --port 5073
```

---

## 📁 Directory Structure

```
frontend/
├── public/                   # Static assets, favicon, brand logos
├── src/
│   ├── api.js                # Centralized Axios/fetch client with JWT interceptors
│   ├── App.js                # Master route configuration and layout wrapper
│   ├── index.js              # React 19 root mounting point
│   ├── components/
│   │   ├── Navbar.js         # Top navigation with search bar, theme toggle, cart counter
│   │   ├── Footer.js         # Eco-friendly footer and platform credentials
│   │   ├── ProductCard.js    # Catalog card with eco-tag badges and quick-add
│   │   ├── VisualSearchModal.js # Drag-and-drop visual search upload modal
│   │   ├── PricePredictionWidget.js # 7-day price forecast and buy/wait card
│   │   ├── CopilotChat.js    # Floating Gemini AI conversational assistant
│   │   └── ThemeToggle.js    # 3-theme switcher component
│   ├── context/
│   │   ├── AuthContext.js    # Customer JWT auth state & profile
│   │   ├── CartContext.js    # Shopping cart items, quantity, and drawer state
│   │   └── ThemeContext.js   # Active theme state (Eco Mint, Clean White, Dark Carbon)
│   ├── pages/
│   │   ├── HomePage.js       # Hero banner, featured products, category shortcuts
│   │   ├── ProductListingPage.js # Search filters, price range, eco-tags, sorting
│   │   ├── ProductDetailPage.js  # High-res gallery, sustainability score, price forecast
│   │   ├── CartPage.js       # Cart overview and checkout summary
│   │   ├── CheckoutPage.js   # Address selection and Razorpay / COD payment trigger
│   │   ├── OrderTrackingPage.js # Live 10-stage fulfillment & GPS shipment tracking
│   │   ├── LoginPage.js      # Customer login form with JWT token handling
│   │   └── RegisterPage.js   # New customer registration with email validation
│   ├── styles/
│   │   ├── theme.css         # CSS variable design tokens for all 3 themes
│   │   └── App.css           # Global layout and responsive styling
│   └── utils/
│       └── stompClient.js    # STOMP / SockJS client helper for real-time tracking
├── index.html
├── package.json
└── vite.config.js
```
