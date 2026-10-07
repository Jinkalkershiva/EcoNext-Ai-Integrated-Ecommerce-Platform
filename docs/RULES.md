# EcoNext — Engineering Rules, Standards & Invariants

**Document Version**: 2.4.0  
**Status**: Mandatory Compliance  
**Scope**: All Services, Frontends, Microservices, and Databases  

---

## 1. Architectural & Domain Invariants (Immutable Rules)

These invariants represent fundamental system constraints. Violating these rules will corrupt data integrity or break distributed consensus.

### Rule 1: Strict Database Domain Isolation
- **Rule**: Every microservice owns its database schema exclusively. Direct cross-database queries or foreign keys between microservice databases are **strictly forbidden**.
- **Enforcement**:
  - `admin-staff-service` only connects to `econext_auth_db`.
  - `order-operations-service` only connects to `econext_order_db`.
  - Django backend only connects to `econext`.
  - Cross-domain data transfer must occur via **REST API** or **Apache Kafka events**.

### Rule 2: Zero Ghost Orders Invariant
- **Rule**: Customer orders must **never** be created in the database before successful payment capture.
- **Enforcement**:
  - The checkout process initiates a Razorpay order without persisting a pending order record.
  - An order record is created only after server-side cryptographic verification of the Razorpay HMAC-SHA256 signature.
  - Abandoned payment modals result in zero database clutter and zero premature inventory depletion.

### Rule 3: Authorized Corridor Validation & Exception Auditing
- **Rule**: Physical shipments follow authorized transportation corridors (e.g., `Ahmedabad → Vadodara → Surat → Mumbai (NH48)`). Orders destined outside this corridor cannot be assigned without explicit authorization.
- **Enforcement**:
  - Attempting to allocate an off-corridor order with `routeException == false` must return **HTTP 400 ROUTE_MISMATCH**.
  - Allocation with `routeException == true` requires a non-empty `exceptionReason` and **must** persist a record to `route_exception_audits` capturing the actor's username, role, timestamp, expected route, actual destination, and reason.

### Rule 4: Multi-Order Consolidated Shipment Release
- **Rule**: In multi-order shipments, the shipment, container, and driver must **not** be marked `DELIVERED` or released until **every assigned order** has been delivered.
- **Enforcement**:
  - Verifying the delivery of Order 1 marks Order 1 as `DELIVERED`, but leaves the shipment `OUT_FOR_DELIVERY` and driver `ON_ROUTE`.
  - Only when all assigned orders reach `DELIVERED` does the shipment transition to `DELIVERED`, automatically releasing the truck container and driver back to `AVAILABLE`.

### Rule 5: Cryptographic Delivery OTP Integrity
- **Rule**: Delivery confirmation must never be bypassed via manual status overrides without customer PIN verification.
- **Enforcement**:
  - 6-digit numeric PINs are hashed using `SHA-256(otp + salt)` before storage.
  - Maximum 5 failed attempts per OTP before security lockout.
  - Single-use replay protection: The OTP entry is purged immediately upon successful verification.

---

## 2. Backend Engineering Standards

### 2.1 Java 21 / Spring Boot 3.3.4 Standards
1. **Lombok & Immutability**:
   - Use `@Data`, `@Builder`, `@NoArgsConstructor`, and `@AllArgsConstructor` for DTOs.
   - Use explicit `@Builder.Default` on entity fields with default values (e.g., `BigDecimal.ZERO`, `new ArrayList<>()`).
2. **JPA Entity & Hibernate Collection Mutation**:
   - **CRITICAL**: For entity collections mapped with `orphanRemoval = true` or `CascadeType.ALL` (e.g., `Shipment.items`), **never** replace the collection reference via `entity.setItems(new ArrayList<>(...))`.
   - **Correct Pattern**:
     ```java
     if (shipment.getItems() == null) {
         shipment.setItems(new ArrayList<>());
     }
     shipment.getItems().add(newItem); // Mutate existing collection
     ```
3. **Transactional Boundaries**:
   - Apply `@Transactional` on all service methods modifying multiple entities or publishing transactional events.
   - Use `@Transactional(readOnly = true)` on search and query methods.
4. **API Response Standardization**:
   - All controller endpoints must wrap responses in `ApiResponse<T>`:
     ```java
     public class ApiResponse<T> {
         private boolean success;
         private String message;
         private T data;
         private LocalDateTime timestamp;
     }
     ```

### 2.2 Python / Django 5.1 Standards
1. **Model Conventions**:
   - All models must specify `created_at` (`auto_now_add=True`) and `updated_at` (`auto_now=True`).
   - Use explicit `db_table` names to prevent naming collisions across apps.
2. **Serializer Validation**:
   - Validate input strictly in DRF `validate_<field>` methods before database operations.
   - Never trust client-submitted prices or totals; always compute totals server-side.
3. **AI/ML Performance**:
   - Machine learning inference (CLIP feature extraction, Linear Regression training) must utilize lightweight caching or precomputed feature arrays to avoid CPU starvation.

---

## 3. Frontend & Admin Portal Standards

### 3.1 React 19 / Vite 6 Conventions
1. **Component Architecture**:
   - Functional components only, utilizing modern React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`).
   - Reusable UI primitives isolated in `components/ui/` or `components/common/`.
2. **API Client & Error Handling**:
   - All HTTP requests go through `src/api/client.js` with Bearer token interceptors.
   - **Error Mapping Rule**:
     - Do not mask backend errors.
     - HTTP 500 errors from backend services must **not** display "Authentication service is temporarily unavailable."
     - Only actual 401/403 authentication failures or network connectivity issues to the auth service should produce authentication error messages.
3. **Responsive Design & Accessibility**:
   - Mobile-first Tailwind CSS utility classes.
   - High-contrast badges for status indicators (e.g., Green for `DELIVERED`, Blue for `IN_TRANSIT`, Yellow for `OPEN`).

---

## 4. Git & Version Control Rules

1. **Commit Message Format**: Follow the Conventional Commits specification:
   - `feat(scope)`: New user-facing feature or capability.
   - `fix(scope)`: Bug fix or regression patch.
   - `docs(scope)`: Documentation updates or additions.
   - `refactor(scope)`: Code modification without business logic change.
   - `test(scope)`: Adding or updating automated verification tests.
2. **Branching Strategy**:
   - `main`: Production-ready, verified codebase.
   - Feature branches: `feat/<feature-name>` or `fix/<bug-name>`.
3. **Zero Secret Policy**:
   - Never commit raw API keys, Razorpay secrets, database passwords, or private JWT keys to Git.
   - Always reference environment variables via `.env` and provide sanitized templates in `.env.example`.
