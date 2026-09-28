# EcoNext Admin & Operations Portal (`admin-frontend`)

[![React 19](https://img.shields.io/badge/React-19.2.3-cyan.svg?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4.3-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Lucide Icons](https://img.shields.io/badge/Lucide-Icons-orange.svg)](https://lucide.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-Live%20Maps-brightgreen.svg)](https://leafletjs.com/)
[![STOMP WebSocket](https://img.shields.io/badge/WebSocket-STOMP%20%2F%20SockJS-blue.svg)]()

The **EcoNext Admin & Operations Portal** is a high-performance, responsive Single-Page Application (SPA) designed for platform administrators, warehouse dispatchers, catalog managers, inventory handlers, and logistics teams.

---

## 📌 Architectural Overview & Authority

The Admin Portal interacts with the backend services **exclusively through the Spring Cloud API Gateway** (`:8080`), with **Spring Boot `admin-staff-service` (`:8085`)** acting as the **Single Source of Truth (SSOT)** for all identity, authentication, and Role-Based Access Control (RBAC/PBAC) operations.

```
+-----------------------------------------------------------------------+
|                 EcoNext Admin Frontend (Port 5074)                    |
+-----------------------------------------------------------------------+
                                   │
                           HTTP / REST / JWT
                                   ▼
+-----------------------------------------------------------------------+
|              Spring Cloud API Gateway (Port 8080)                     |
+-----------------------------------------------------------------------+
            │                                             │
   /api/admin/**, /api/staff/**             /api/order-ops/**, /ws-tracking
            ▼                                             ▼
+-----------------------+                    +--------------------------+
|  admin-staff-service  |                    | order-operations-service |
|      (Port 8085)      |                    |       (Port 8084)        |
+-----------------------+                    +--------------------------+
            │                                             │
      MySQL (econext_auth_db)                       MySQL (econext_order_db)
```

---

## 🚀 Key Features

### 1. Unified Authentication & Authoritative Staff Management
- **Stateless JWT Security**: Authenticates via `POST /api/admin/auth/login` and validates current profile via `GET /api/admin/auth/me`.
- **Dynamic Role Provisioning**: Real-time role dropdown populated dynamically from `GET /api/admin/staff/roles/` directly from `econext_auth_db`.
- **Zero Fallback Integrity**: Eliminates legacy/stale user stores; all admin/staff records reside in the authoritative MySQL database (`admin_staff_members`, `admin_roles`).

### 2. Dual-Dashboard Architecture
- **Administrator Command Center (`ROLE_ADMIN`)**:
  - Full system governance, real-time KPI overview, staff provisioning modal, permission matrices, system audit trails, and live database switchers.
- **Staff Operations Dashboard (`STAFF_*` / Operational Roles)**:
  - Role-focused workspace displaying task queues, shipment dispatch controls, inventory adjustments, and catalog workflows tailored specifically to the authenticated user's assigned role.

### 3. Comprehensive 8-Role Operational RBAC/PBAC Matrix
1. **`ROLE_ADMIN`**: Full administrative governance, user provisioning, role assignments, audit logs.
2. **`INVENTORY_MANAGER`**: Stock level auditing, low-stock threshold triggers, inventory adjustments.
3. **`CATALOG_MANAGER`**: SKU listings, product categorization, sustainability badges, price updates.
4. **`ORDER_MANAGER`**: Order lifecycle oversight, fulfillment assignment, cancellation handling.
5. **`ORDER_PROCESSING_STAFF`**: Order picking, packaging, and status advancement.
6. **`DATA_ANALYST`**: Conversion analytics, sales charts, telemetry reporting.
7. **`DATA_ENTRY_STAFF`**: Batch CSV/Excel ingestion, product data sanitation.
8. **`DELIVERY_STAFF`**: Route inspection, shipment handoffs, proof-of-delivery updates.

### 4. Real-Time Fulfillment & GPS Shipment Tracking
- **Physical Shipment Hierarchy**: Fully models `Order` $\rightarrow$ `Shipments` $\rightarrow$ `ShipmentItems`.
- **Interactive GPS Maps**: Embedded Leaflet / OpenStreetMap visualizer tracking active trucks, routes, origin/destination nodes, and real-time latitude/longitude coordinates.
- **WebSocket / STOMP Live Telemetry**: Connects to `/ws-tracking` listening to `/topic/shipments/{shipmentId}`, `/topic/orders/{orderId}`, `/topic/fulfillment/activity`, and `/topic/fulfillment/analytics`.

### 5. UI Customization & Accessibility
- **Theme Lamp Toggle**: Intuitive theme switcher with custom design tokens.
- **UI Scale Controller**: Scalable display density slider (85% to 115%) for warehouse terminals and desktop screens.
- **Role-Aware Sidebar**: Dynamically filters navigation links based on user permissions and assigned roles.

---

## 🛠️ Environment Configuration

The application is configured using Vite environment variables. Create a `.env` file in the `admin-frontend/` root:

```env
# Spring Cloud API Gateway Base URL
VITE_API_URL=http://127.0.0.1:8080/api

# WebSocket / STOMP Real-Time Tracking Endpoint
VITE_WS_URL=http://127.0.0.1:8080/ws-tracking
```

> [!NOTE]
> Never commit `.env` files containing environment secrets to version control. The `.gitignore` file automatically excludes all `.env` and `.env.local` files.

---

## 📦 Getting Started & Scripts

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### Installation
```bash
cd admin-frontend
npm install
```

### Development Server
```bash
# Starts development server on port 5074
npm run dev -- --port 5074
```
Open [http://localhost:5074](http://localhost:5074) to access the Admin Portal.

### Production Build
```bash
npm run build
```
Builds optimized production assets to the `dist/` folder.

### Production Preview
```bash
npm run preview -- --port 5074
```

---

## 📁 Directory Structure

```
admin-frontend/
├── src/
│   ├── api/
│   │   ├── client.js             # Centralized Axios client with JWT interceptor
│   │   ├── adminApis.js          # Admin & legacy compatibility endpoints
│   │   └── operationsApis.js     # Gateway-routed microservice endpoints
│   ├── components/
│   │   ├── AdminLayout.jsx       # Base layout wrapper with Header & Sidebar
│   │   ├── Sidebar.jsx           # Role-filtered navigation sidebar
│   │   ├── Header.jsx            # User profile dropdown, notifications, logout
│   │   ├── ThemeLampToggle.jsx   # Theme switcher component
│   │   ├── UiScaleControl.jsx    # Interface scaling component
│   │   ├── DataTable.jsx         # Generic searchable/paginated data table
│   │   ├── StatCard.jsx          # Metric cards with trend indicators
│   │   └── Modal.jsx             # Accessible overlay modal dialog
│   ├── context/
│   │   ├── AuthContext.jsx       # Staff auth state, tokens, permissions, roles
│   │   └── ThemeContext.jsx      # Theme state and design token management
│   ├── pages/
│   │   ├── DashboardPage.jsx     # Dual Admin Command Center & Staff Dashboard
│   │   ├── FulfillmentPage.jsx   # Live GPS shipment tracking & fulfillment KPIs
│   │   ├── OrdersPage.jsx        # 10-stage sequential order state manager
│   │   ├── StaffManagementPage.jsx # Staff account provisioning & role management
│   │   ├── ProductsPage.jsx      # SKU catalog management & sustainability tags
│   │   ├── InventoryPage.jsx     # Stock levels & low-inventory alerts
│   │   ├── AnalyticsPage.jsx     # Sales, conversion, and operational metrics
│   │   ├── ImportWizardPage.jsx  # Bulk CSV / Excel catalog ingestion
│   │   └── AuditLogsPage.jsx     # Forensic operational audit logs
│   ├── styles/
│   │   ├── tokens.css            # CSS variables and color system
│   │   ├── layout.css            # Grid and flexbox structure
│   │   ├── components.css        # Card, table, button, and input styles
│   │   └── global.css            # Base resets and typography
│   └── utils/
│       └── stompClient.js        # STOMP / SockJS WebSocket client helper
├── index.html
├── package.json
└── vite.config.js
```
