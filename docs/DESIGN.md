# EcoNext — System Design, Workflows & State Machines

**Document Version**: 2.4.0  
**Scope**: Core Workflows, Visual Diagrams, State Transitions, and Cryptographic Security Models  

---

## 1. Data Flow Diagrams (DFD)

### 1.1 DFD Level 0 — Context Diagram
```
                     ┌───────────────────────┐
                     │   Customer Shopper    │
                     └───────────┬───────────┘
                                 │
     Product Browsing, AI Queries,│ Customer Profile, Orders,
     Cart Mutations, Payment     │ Delivery PIN Verification
                                 ▼
                     ┌───────────────────────┐
                     │                       │
                     │   EcoNext Platform    │
                     │  (Distributed Core)   │
                     │                       │
                     └───────────▲───────────┘
                                 │
     Inventory Ingestion, Fleet  │ Real-time Telemetry,
     Scheduling, Order Allocation│ Exception Overrides, Audits
                                 │
                     ┌───────────┴───────────┐
                     │  Operational Staff    │
                     │  (Admin, Dispatcher)  │
                     └───────────────────────┘
```

---

## 2. Sequence Diagrams

### 2.1 Sequence Diagram: Cryptographic Razorpay Payment & Order Creation
```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Browser)
    participant Gateway as API Gateway (8080)
    participant PaySvc as payment-service (8085)
    participant Razorpay as Razorpay Gateway
    participant OrderOps as order-operations-service (8084)
    participant Kafka as Apache Kafka

    Customer->>Gateway: POST /api/payments/razorpay/create-order (amount, cartId)
    Gateway->>PaySvc: Forward request
    PaySvc->>Razorpay: Create Order (amount_in_paise, receipt)
    Razorpay-->>PaySvc: Return razorpay_order_id
    PaySvc-->>Customer: Return order_id & public key

    Customer->>Razorpay: Open Checkout Modal & Pay
    Razorpay-->>Customer: Return payment_id, order_id, signature

    Customer->>Gateway: POST /api/payments/razorpay/verify-signature
    Gateway->>PaySvc: Forward signature & payment details
    PaySvc->>PaySvc: Compute HMAC-SHA256(order_id + "|" + payment_id)
    PaySvc->>PaySvc: Compare against razorpay_signature

    alt Valid Signature
        PaySvc->>OrderOps: POST /api/order-ops/orders (Persist Confirmed Order)
        OrderOps-->>PaySvc: Order Created (#ORD-104)
        PaySvc->>Kafka: Publish PaymentCapturedEvent
        PaySvc-->>Customer: HTTP 200 Order Confirmed (#ORD-104)
    else Invalid Signature
        PaySvc-->>Customer: HTTP 400 Cryptographic Mismatch (Payment Rejected)
    end
```

---

### 2.2 Sequence Diagram: Complete Fulfillment, Corridor Audit & OTP Delivery
```mermaid
sequenceDiagram
    autonumber
    actor Dispatcher as Dispatcher (Admin UI)
    participant Gateway as API Gateway (8080)
    participant OrderOps as order-operations-service (8084)
    participant DB as econext_order_db
    participant Email as Email Notification Service
    actor Driver as Fleet Driver
    actor Customer as Customer

    Note over Dispatcher,OrderOps: 1. Create Open Shipment Buffer (0-orders)
    Dispatcher->>Gateway: POST /api/order-ops/shipments (origin, dest, route, vehicle)
    Gateway->>OrderOps: Forward request
    OrderOps->>DB: INSERT INTO shipments (status='OPEN', order_id=NULL)
    OrderOps-->>Dispatcher: Shipment #SHP-1041 Created (Status: OPEN)

    Note over Dispatcher,OrderOps: 2. Order Allocation & Corridor Verification
    Dispatcher->>Gateway: POST /api/order-ops/shipments/43/orders (orderId: 95, routeException: false)
    Gateway->>OrderOps: Forward request
    OrderOps->>OrderOps: Check route corridor (Gujarat-Mumbai vs Bengaluru)
    OrderOps-->>Dispatcher: HTTP 400 ROUTE_MISMATCH (Off-corridor without reason)

    Dispatcher->>Gateway: POST /api/order-ops/shipments/43/orders (orderId: 95, routeException: true, reason: 'Inter-hub')
    Gateway->>OrderOps: Forward request
    OrderOps->>DB: Record RouteExceptionAudit & update usedWeight / usedVolume
    OrderOps-->>Dispatcher: HTTP 200 Order Assigned

    Note over Dispatcher,OrderOps: 3. Driver & Fleet Assignment
    Dispatcher->>Gateway: POST /api/order-ops/shipments/43/assign-driver-truck (driverId: 1, containerId: 2)
    Gateway->>OrderOps: Forward request
    OrderOps->>DB: UPDATE logistics_drivers SET status='ASSIGNED' WHERE id=1
    OrderOps-->>Dispatcher: Driver Rajesh Kumar Assigned

    Note over Dispatcher,OrderOps: 4. Physical Dispatch & GPS Telemetry
    Dispatcher->>Gateway: POST /api/order-ops/shipments/43/dispatch
    Gateway->>OrderOps: Forward request
    OrderOps->>DB: UPDATE shipments SET status='IN_TRANSIT', driver='ON_ROUTE', container='IN_TRANSIT'
    OrderOps-->>Dispatcher: Shipment Dispatched

    Driver->>Gateway: PATCH /api/order-ops/shipments/43/location (lat: 21.1702, lon: 72.8311)
    Gateway->>OrderOps: Forward GPS Telemetry
    OrderOps->>DB: INSERT INTO logistics_tracking_events (Surat NH48 Toll)

    Note over Dispatcher,OrderOps: 5. Out for Delivery & OTP Verification
    Dispatcher->>Gateway: PATCH /api/order-ops/shipments/43/status?status=OUT_FOR_DELIVERY
    Gateway->>OrderOps: Forward status update
    Dispatcher->>Gateway: POST /api/order-ops/shipments/43/delivery-otp/send
    Gateway->>OrderOps: Forward request
    OrderOps->>OrderOps: Generate 6-digit PIN, hash with SHA-256 + salt
    OrderOps->>Email: Send PIN to customer email
    Email-->>Customer: Deliver 6-digit PIN (e.g., 200706)

    Customer->>Driver: Share PIN upon package arrival
    Driver->>Gateway: POST /api/order-ops/shipments/43/delivery-otp/verify (otp: '200706')
    Gateway->>OrderOps: Forward verification
    OrderOps->>OrderOps: Validate hash match (attempts < 5)

    OrderOps->>DB: UPDATE operational_orders SET status='DELIVERED'
    OrderOps->>DB: INSERT INTO delivery_verification_audits (Verified via OTP)
    OrderOps->>OrderOps: Check if all assigned orders in shipment are DELIVERED

    alt All Orders in Shipment Delivered
        OrderOps->>DB: UPDATE shipments SET status='DELIVERED'
        OrderOps->>DB: UPDATE logistics_drivers SET status='AVAILABLE', assigned_shipment_id=NULL
        OrderOps->>DB: UPDATE containers SET status='AVAILABLE'
    end
    OrderOps-->>Driver: HTTP 200 Verified & Order Delivered
```

---

## 3. Operational State Machine Models

### 3.1 Customer Order State Machine
```
[ORDER_PLACED]
      │
      ▼ (Razorpay payment captured)
[ORDER_CONFIRMED]
      │
      ▼ (Warehouse picking & packaging)
[PACKED]
      │
      ▼ (Assigned to shipment buffer)
[ASSIGNED_TO_SHIPMENT]
      │
      ▼ (Vehicle departure)
[IN_TRANSIT]
      │
      ▼ (Final-mile delivery hub reached)
[OUT_FOR_DELIVERY]
      │
      ▼ (Customer 6-digit OTP verified)
[DELIVERED]
```
*(Alternative terminal transitions: `CANCELLED` prior to physical dispatch, or `RETURN_REQUESTED` post-delivery).*

---

### 3.2 Physical Shipment State Machine
```
[OPEN] (Can accept new orders, load buffers)
      │
      ▼ (Capacity reached or dispatcher locks assignment)
[READY_FOR_DISPATCH]
      │
      ▼ (Vehicle departs warehouse hub)
[IN_TRANSIT]
      │
      ▼ (Arrives at final destination city / local dispatch hub)
[OUT_FOR_DELIVERY]
      │
      ▼ (All assigned orders cryptographically verified via OTP)
[DELIVERED] (Driver & Container reset to AVAILABLE)
```

---

### 3.3 Logistics Driver State Machine
```
[AVAILABLE] ──(Assigned to open shipment)──> [ASSIGNED]
     ▲                                            │
     │                                            │ (Shipment dispatched)
     │                                            ▼
     └──(All assigned orders verified DELIVERED)── [ON_ROUTE]
```

---

### 3.4 Truck / Container State Machine
```
[CREATED / AVAILABLE] ──(Shipment dispatched into transit)──> [IN_TRANSIT]
          ▲                                                         │
          │                                                         │
          └───(All assigned shipment packages DELIVERED)────────────┘
```

---

## 4. Cryptographic Delivery OTP Security Architecture

```
                                  6-Digit PIN Generation
                               (SecureRandom: 100000 - 999999)
                                             │
                                             ▼
                               Salted SHA-256 Hashing
                         MessageDigest.getInstance("SHA-256")
                        Salt: "econext-delivery-salt-" + orderId
                                             │
                                             ▼
                              Persistent Cache Storage
                           Redis Key: delivery:otp:{orderId}
                           Fallback: inMemoryOrderOtpStore
                              TTL: 300 Seconds (5 Minutes)
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
             Customer Notification                          Driver Verification
          Email via SMTP / Template                        POST .../delivery-otp/verify
         Masked: j***s@gmail.com                                  Raw OTP Input
                                                                    │
                                                                    ▼
                                                            Cryptographic Check:
                                                        hash(raw, salt) == storedHash
                                                                    │
                                            ┌───────────────────────┴───────────────────────┐
                                            ▼ (Match)                                       ▼ (Mismatch)
                                    Clear OTP Token                               Increment Attempt Counter
                           Record DeliveryVerificationAudit                        (Max: 5 before lockout)
                               Mark Order DELIVERED                                 Return HTTP 400 Bad OTP
```
