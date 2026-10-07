# EcoNext — Product Requirements Document (PRD)

**Document Version**: 2.4.0  
**Status**: Approved & Fully Implemented  
**Classification**: Enterprise E-Commerce & Logistics Platform  
**Target Architecture**: Java 21 / Spring Boot 3.3.4 Microservices + Python Django 5.1 / AI ML Engine + React 19 Storefront & Admin Portals  

---

## 1. Executive Summary & Product Vision

### 1.1 Vision Statement
**EcoNext** is an enterprise-grade, sustainability-centric e-commerce and distributed supply chain ecosystem. The platform seamlessly bridges multi-modal artificial intelligence (computer vision product discovery, 60-day historical price forecasting, intent-based semantic search, and LLM-grounded conversational commerce) with a mission-critical, distributed **Spring Boot microservices fulfillment backbone** and an autonomous **fleet and GPS logistics tracking system**.

### 1.2 Core Value Propositions
1. **Intelligent, Low-Friction Discovery**: Customers find products effortlessly through image uploads (OpenAI CLIP ViT + HSV histograms), natural language lifestyle queries (TF-IDF vector matching), and conversational shopping assistance (Google Gemini).
2. **Transparent, Sustainable Retail**: Quantitative sustainability ratings, carbon-neutral fulfillment certifications, and transparent lifecycle tracking empower eco-conscious consumer decision-making.
3. **Data-Driven Price Confidence**: The "Buy or Wait" predictive engine eliminates price hesitation by projecting 7-day price trajectories with statistical confidence scores.
4. **Guaranteed Payment & Order Integrity**: Cryptographic HMAC-SHA256 Razorpay payment verification ensures zero ghost-order creation and deterministic order state transitions.
5. **Real-Time Physical Fulfillment & Telemetry**: Consolidated truck container clustering, route corridor validation, driver assignment isolation, live GPS checkpoint tracking, and OTP delivery verification ensure reliable physical logistics.
6. **Enterprise Operational Governance**: Fine-grained 8-Role Role-Based and Permission-Based Access Control (RBAC/PBAC) with comprehensive forensic audit trails for administrative staff.

---

## 2. Target User Personas

| Persona | Role & Objectives | Key Platform Touchpoints |
| :--- | :--- | :--- |
| **P1: Eco-Conscious Shopper** | Wants sustainable products, price stability, fast image search, and real-time tracking | Customer Storefront (Catalog, Visual Search, Price Predictor, Copilot, Order Timeline) |
| **P2: Store / Catalog Manager** | Oversees catalog pricing, eco-tag taxonomy, stock replenishment, and bulk data imports | Admin Portal (`ProductsPage`, `BulkImportPage`, `CatalogOperationsService`) |
| **P3: Order Processor** | Validates customer orders, inspects fraud flags, assigns orders to fulfillment batches | Admin Portal (`OrdersPage`, `OrderOperationsService`) |
| **P4: Logistics Dispatcher** | Clusters orders into shipments, assigns fleet trucks and drivers, monitors corridor routes | Admin Portal (`FulfillmentGPSPage`, `ShipmentService`, `ContainerService`) |
| **P5: Delivery Fleet Driver** | Navigates assigned transportation corridors, updates physical milestones, collects delivery OTP | Fleet Telemetry APIs, Driver Management Panel |
| **P6: Compliance & Audit Officer** | Audits route exception overrides, inspects financial logs, enforces forensic access trails | Admin Portal (`AuditLogsPage`, `RouteExceptionAuditRepository`) |
| **P7: System Administrator** | Manages staff accounts, provisions RBAC/PBAC security roles, monitors microservice health | Admin Portal (`StaffManagementPage`, `ApiGateway`, Spring Boot Actuator) |

---

## 3. Product Scope & Functional Requirements

### 3.1 Customer Storefront & AI Experience

#### FR-1.1: Multi-Modal Visual Search ("Snap & Shop")
- **Requirement**: Users upload an image file (JPG, PNG, WebP) or photo via mobile camera to discover visually similar products.
- **Implementation**: Multi-modal visual engine in `backend/ml_engine/visual_search.py` using OpenAI CLIP ViT-B/32 neural embeddings (512 dimensions) with an OpenCV 3D HSV color histogram fallback.
- **Acceptance Criteria**:
  - Image upload returns top 10 ranked products by cosine similarity within 1,200ms.
  - Graceful fallback to HSV histogram matching if deep neural models are offline.

#### FR-1.2: "Buy or Wait" 7-Day Price Forecast
- **Requirement**: Product detail views display 60-day historical pricing trends and project next 7-day price movements with an actionable buying recommendation.
- **Implementation**: Scikit-learn Linear Regression model in `backend/ml_engine/price_predictor.py`.
- **Outputs**:
  - `BUY_NOW` / `BEST_PRICE`: Predicted price increase > 5%.
  - `WAIT`: Predicted price drop > 5%.
  - `NEUTRAL`: Price variance within ±5%.
  - Confidence score ($R^2$ bounded between 0.00 and 1.00).

#### FR-1.3: Natural Language Intent Search
- **Requirement**: Search queries reflecting lifestyle intents (e.g., *"plastic free ocean cleanup"*, *"office desk setup"*) return semantically relevant items.
- **Implementation**: TF-IDF Vectorizer with cosine similarity scoring across product titles, descriptions, categories, and sustainability tags.

#### FR-1.4: Grounded AI Copilot Assistant
- **Requirement**: Conversational chat interface assisting shoppers with product questions, sizing, and carbon impact.
- **Implementation**: Google Gemini LLM in `backend/copilot/`, strictly prompt-grounded in active database inventory to prevent hallucinations.

#### FR-1.5: Razorpay Checkout & Cryptographic Payment Capture
- **Requirement**: Zero ghost-order creation. Orders are persisted in the confirmed state only after successful online payment capture.
- **Implementation**: Server-side amount computation, Razorpay order generation, and client-side signature verification using `HMAC-SHA256(order_id + "|" + payment_id, secret)`.

---

### 3.2 Enterprise Administrative Operations & Governance

#### FR-2.1: Granular 8-Role RBAC / PBAC Hierarchy
The platform enforces 8 immutable operational roles managed by `admin-staff-service` (Port 8081):
1. **ROLE_ADMIN / SUPER_ADMIN**: Full system governance, staff provisioning, permission override.
2. **ROLE_STORE_MANAGER**: Storewide oversight, analytics, catalog approval, promotions.
3. **ROLE_CATALOG_SPECIALIST**: Product taxonomies, category maintenance, bulk CSV/Excel imports.
4. **ROLE_INVENTORY_CONTROLLER**: Stock adjustments, reorder thresholds, warehouse inbound audits.
5. **ROLE_ORDER_PROCESSOR**: Order state machine progression, cancellation reviews, refund authorization.
6. **ROLE_LOGISTICS_DISPATCHER**: Multi-shipment dispatching, truck allocation, driver scheduling, corridor route exceptions.
7. **ROLE_CUSTOMER_SUPPORT**: Read-only order and customer timeline inspection, customer profile assistance.
8. **ROLE_AUDIT_OFFICER**: Forensic audit trail inspection, route exception logs, access log reviews.

#### FR-2.2: Staff Management & Forensic Audit Logging
- Dedicated endpoints for staff invitation, role assignment, status toggling (Active/Suspended), and credential revocation.
- Every state mutation records actor ID, username, IP address, role, entity modified, timestamp, and audit payload.

---

### 3.3 Fulfillment & Physical Logistics Engine

#### FR-3.1: Logistics Container & Fleet Management
- Provisioning of heavy electric fleet vehicles and containers (e.g., `ECO-TRK-001`, `GJ01AB1234`).
- Physical capacity modeling: Maximum weight capacity (kg) and maximum volume capacity ($m^3$).
- Automatic calculation of used capacity, remaining capacity, weight utilization percentage, and volume utilization percentage.

#### FR-3.2: Driver Registration & Warehouse Isolation
- Driver onboarding with commercial license number, contact details, and warehouse assignment.
- Strict isolation: Drivers can only be scheduled for shipments originating from their registered warehouse hub.
- Concurrency protection: Drivers in `ASSIGNED` or `ON_ROUTE` status cannot be double-booked to conflicting active shipments.

#### FR-3.3: Open Shipment Buffer Support (0-Order Creation)
- Dispatchers can create open shipment buffers with 0 initial allocated orders (`order_id = null`, `status = OPEN`).
- Provides staging units for planned route corridors (e.g., `Ahmedabad → Vadodara → Surat → Mumbai (NH48)`).

#### FR-3.4: Order Allocation & Corridor Route Validation
- Ready customer orders are allocated to open shipments matching origin warehouse and destination corridor.
- **Enforced Business Rule**:
  - If order destination matches the shipment's planned corridor: Accepted.
  - If order destination is off-corridor (e.g., destination is `Bengaluru` while shipment route is `NH48 Gujarat-Mumbai`):
    - When `routeException == false`: Rejected with **HTTP 400 ROUTE_MISMATCH**.
    - When `routeException == true` and an explicit `exceptionReason` is provided: Accepted and recorded in `route_exception_audits`.

#### FR-3.5: State Machine Lifecycle Progression
The shipment and assigned orders follow a deterministic state machine:
```
[OPEN] ──> [READY_FOR_DISPATCH] ──> [IN_TRANSIT] ──> [OUT_FOR_DELIVERY] ──> [DELIVERED]
```
- **Dispatch**: Transitions shipment to `IN_TRANSIT`, driver to `ON_ROUTE`, container to `IN_TRANSIT`, and orders to `IN_TRANSIT`.
- **GPS Milestone Updates**: Dispatchers update vehicle latitude/longitude coordinates and toll/corridor milestones.
- **Out for Delivery**: Marks items for final-mile customer delivery.

#### FR-3.6: Cryptographic Delivery OTP Verification
- For final-mile delivery confirmation, an automated 6-digit numeric PIN is generated for the customer.
- **Security Constraints**:
  - OTP hashed with SHA-256 + salt before storage in Redis (or in-memory cache fallback).
  - Production TTL: 300 seconds (5 minutes).
  - Maximum 5 failed verification attempts before locking.
  - Replay protection: Token invalidated immediately upon successful verification.
- **Completion Trigger**:
  - Each customer package verified individually.
  - When **all** assigned orders in a consolidated shipment reach `DELIVERED`, the shipment status automatically transitions to `DELIVERED`, and both the truck container and driver are automatically released back to `AVAILABLE`.

---

## 4. Non-Functional Requirements (NFR)

| Category | Specification | Implementation Target |
| :--- | :--- | :--- |
| **Availability** | High availability with decoupled service failure zones | 99.9% uptime; Gateway fallback routes ensure core services survive microservice outages |
| **Latency** | REST API response time for cached and operational reads | P95 < 150ms; Product search P95 < 350ms; Visual search P95 < 1,200ms |
| **Throughput** | Distributed order throughput under concurrent traffic | 500+ concurrent checkout requests without lock contention |
| **Security** | Authentication, authorization, and transport security | Stateless JWT tokens, HTTPS/TLS, HMAC-SHA256 signatures, PBAC Method Security |
| **Data Integrity** | Strict database ownership and ACID transactional boundaries | Database-per-service pattern, `@Transactional` boundaries, zero schema sharing |
| **Auditability** | Complete forensic audit trail for state changes and overrides | Append-only transition tables (`order_status_transitions`, `route_exception_audits`) |

---

## 5. Success Metrics & Key Performance Indicators (KPIs)

1. **Checkout Conversion**: Conversion rate increase due to "Buy or Wait" price transparency.
2. **Ghost Order Rate**: 0.00% ghost orders achieved via strict post-payment capture ordering.
3. **Logistics Efficiency**: > 85% average truck capacity volume utilization achieved via container load clustering.
4. **Corridor Compliance**: 100% of off-corridor order assignments recorded with authorized staff attribution.
5. **Delivery Trust**: 100% of delivered orders cryptographically audited via customer OTP verification.
