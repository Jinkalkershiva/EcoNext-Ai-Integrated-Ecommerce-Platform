# EcoNext CI/CD Pipeline Architecture & Operations Guide

This document specifies the production continuous integration and continuous deployment (CI/CD) architecture for the EcoNext platform.

---

## 1. Pipeline Overview

EcoNext employs a decoupled, multi-tiered GitHub Actions pipeline:

```
[ Developer Push / Pull Request ]
               │
               ▼
┌──────────────────────────────────────────────┐
│        Continuous Integration (CI)           │
│  - Security & Repository Hygiene             │
│  - Django Backend Suite (Python 3.13)        │
│  - Spring Microservices Suite (Java 21)      │
│  - Customer React Frontend (Node 20 / Vite)  │
│  - Admin React Frontend (Node 20 / Vite)     │
│  - Container Build Validation                │
└──────────────────────────────────────────────┘
               │ (Success on main branch)
               ▼
┌──────────────────────────────────────────────┐
│        Continuous Deployment (CD)            │
│  - Verify CI Prerequisites                   │
│  - Build & Publish Container Images (GHCR)   │
│  - Production Deployment Guard & Verification│
│  - Health Check Verification Contract        │
└──────────────────────────────────────────────┘
```

---

## 2. CI Pipeline Specification (`.github/workflows/ci.yml`)

### Triggers
- **Pull Requests**: Targeting the `main` branch.
- **Pushes**: Merged to the `main` branch.
- **Manual Dispatch**: `workflow_dispatch` trigger for on-demand execution.

### Jobs & Execution Matrix
1. **`security-hygiene`**:
   - Audits git index for forbidden tracked `.env*` configuration files.
   - Audits repository for private cryptographic keys (`*.pem`, `*.key`, `*.pfx`, etc.).
   - Runs `git diff --check` to prevent merge artifacts or formatting corruptions.
2. **`django-backend`**:
   - Environment: Python 3.13 on `ubuntu-latest`.
   - Dependency Caching: pip cache keyed against `backend/requirements.txt`.
   - Isolation: Operates with in-memory / file-based SQLite database (`DB_ENGINE=django.db.backends.sqlite3`), eliminating dependencies on external database daemons during unit and integration test runs.
   - Commands: `python manage.py check`, `python manage.py test --no-input`.
3. **`spring-microservices`**:
   - Environment: JDK 21 (Temurin) on `ubuntu-latest`.
   - Dependency Caching: Maven repository cache keyed on POM files.
   - Scope: Builds and tests the multi-module Maven reactor (`microservices/pom.xml`):
     - `api-gateway`
     - `auth-service`
     - `cart-service`
     - `payment-service`
     - `notification-service`
     - `admin-staff-service`
     - `catalog-operations-service`
     - `order-operations-service`
     - `data-import-analysis-service`
   - Command: `mvn -B test`.
4. **`customer-frontend`**:
   - Environment: Node.js 20 on `ubuntu-latest`.
   - Dependency Caching: npm cache keyed on `frontend/package-lock.json`.
   - Commands: `npm ci`, `npm run build`.
5. **`admin-frontend`**:
   - Environment: Node.js 20 on `ubuntu-latest`.
   - Dependency Caching: npm cache keyed on `admin-frontend/package-lock.json`.
   - Commands: `npm ci`, `npm run build`.
6. **`docker-validation`**:
   - Dynamically scans for application Dockerfiles. If present, runs syntax and build validation without pushing images.

---

## 3. CD Pipeline Specification (`.github/workflows/cd.yml`)

### Triggers
- **Automatic**: Triggered upon completion of the CI workflow on the `main` branch (`workflow_run`).
- **Manual**: Triggered on demand via `workflow_dispatch` with parameters for target environment and optional image tag override.

### Registry & Image Tagging Strategy (GHCR)
- **Registry**: GitHub Container Registry (`ghcr.io`).
- **Authentication**: Native GitHub Actions token (`GITHUB_TOKEN`) with `packages: write` permissions.
- **Naming Pattern**:
  ```
  ghcr.io/<repository-owner>/<image-name>:<tag>
  ```
- **Tagging**:
  - **Immutable SHA**: `${{ github.sha }}` (primary tag for auditability and zero-downtime rollbacks).
  - **Floating Tag**: `latest` (tracks latest validated main release).

### Production Environment Protection
- Uses GitHub Actions Environment: **`production`**.
- Configurable with GitHub Environment Protection Rules:
  - Required Reviewers / Manual Approval Gates.
  - Deployment branch restrictions (strictly limited to `main`).
  - Environment-scoped secrets.

---

## 4. Environment Variables & Secrets Reference

> [!IMPORTANT]
> Never commit actual secret values into git or workflow files. Configure these keys directly within GitHub Repository or Environment Settings.

### A. CI Workflow Variables (Non-Secret / Ephemeral)
Used automatically within the pipeline runners:
- `DJANGO_DEBUG`: `False`
- `DJANGO_SECRET_KEY`: CI dummy secret key (minimum 32 characters)
- `DJANGO_ALLOWED_HOSTS`: `localhost,127.0.0.1,testserver`
- `DB_ENGINE`: `django.db.backends.sqlite3`
- `USE_REDIS`: `False`
- `RAZORPAY_KEY_ID`: `rzp_test_ci_mock_key_id`
- `RAZORPAY_KEY_SECRET`: `rzp_test_ci_mock_key_secret`

### B. CD / Deployment Secrets (GitHub Repository / Environment Secrets)
- `GITHUB_TOKEN`: Provided natively by GitHub Actions runner (`packages: write`).
- *Future Hosting Integration Secrets (as required by chosen provider)*:
  - `SSH_HOST`: Target server hostname or IP.
  - `SSH_USER`: Deployment user.
  - `SSH_PRIVATE_KEY`: Deployment private SSH key.
  - *OR* `KUBECONFIG` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.

### C. Production Runtime Application Secrets (Target Host / Environment Secrets)
Variables required at runtime by services in production:

| Variable Name | Component | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | Django Backend | Cryptographic signing key for Django |
| `DJANGO_ALLOWED_HOSTS` | Django Backend | Permitted Host headers (e.g. `api.econext.com`) |
| `CORS_ALLOWED_ORIGINS` | Django & Gateway | Permitted frontend origins |
| `CSRF_TRUSTED_ORIGINS` | Django Backend | Permitted CSRF origins |
| `DB_HOST` | All Backends | Production database host |
| `DB_PORT` | All Backends | Production database port (3306) |
| `DB_USER` | All Backends | Production MySQL user |
| `DB_PASSWORD` | All Backends | Production MySQL password |
| `REDIS_HOST` | Django & Spring | Production Redis host |
| `REDIS_PORT` | Django & Spring | Production Redis port (6379) |
| `REDIS_PASSWORD` | Django & Spring | Production Redis password |
| `KAFKA_BOOTSTRAP_SERVERS` | Microservices | Production Kafka bootstrap brokers |
| `JWT_SECRET` | Auth & Microservices | Shared secret for JWT signature validation |
| `INTERNAL_SERVICE_KEY` | Microservices | Inter-service authentication token |
| `RAZORPAY_KEY_ID` | Django & Payment Svc | Razorpay live/test key identifier |
| `RAZORPAY_KEY_SECRET` | Django & Payment Svc | Razorpay live/test secret key |
| `RAZORPAY_WEBHOOK_SECRET` | Django Backend | Razorpay webhook signature secret |
| `GEMINI_API_KEY` | Copilot & Import Svc | Google Gemini API key for AI features |
| `EMAIL_HOST_USER` | Django Backend | SMTP notification email address |
| `EMAIL_HOST_PASSWORD` | Django Backend | SMTP authentication password |

---

## 5. Production Safety Guardrails

### 1. Database DDL Rule: `JPA_DDL_AUTO=validate`
In production, Spring Data JPA services **must** run with:
```bash
JPA_DDL_AUTO=validate
```
Under no circumstances should `create`, `create-drop`, or `update` be used against a live production database. All schema changes must be applied via controlled, versioned migration scripts.

### 2. Django Security Hardening
In production:
- `DJANGO_DEBUG=False`
- `SECURE_SSL_REDIRECT=True` (or handled via TLS reverse proxy such as NGINX / Traefik / Caddy)
- `SESSION_COOKIE_SECURE=True`
- `CSRF_COOKIE_SECURE=True`

### 3. Payment Gateway Safety
- Live Razorpay credentials (`rzp_live_*`) must **only** be deployed to production.
- CI and test suites run in isolated mock mode with zero external HTTP calls to Razorpay.
- Real transactions cannot be executed during pipeline runs.

---

## 6. Target Hosting Integration Guide

Since the production hosting provider is deployment-provider-neutral in the pipeline, here is how to connect the deployment job to your chosen target:

### Option A: VPS with Docker Compose
1. Store target server details in GitHub Environment Secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`.
2. Add an SSH execution step in `deploy-production` job in `.github/workflows/cd.yml`:
   ```yaml
   - name: Deploy to VPS
     uses: appleboy/ssh-action@v1.0.3
     with:
       host: ${{ secrets.SSH_HOST }}
       username: ${{ secrets.SSH_USER }}
       key: ${{ secrets.SSH_PRIVATE_KEY }}
       script: |
         cd /opt/econext
         docker compose pull
         docker compose up -d --remove-orphans
   ```

### Option B: Kubernetes (K8s) Cluster
1. Store cluster credentials in GitHub Environment Secret: `KUBECONFIG`.
2. Update deployment image tags using `kubectl`:
   ```yaml
   - name: Deploy to Kubernetes
     run: |
       kubectl set image deployment/econext-gateway \
         gateway=ghcr.io/${{ github.repository_owner }}/econext-api-gateway:${{ github.sha }}
   ```

### Option C: PaaS (Coolify / CapRover / Dokku / Railway)
1. Store deployment webhook URL in GitHub Environment Secret: `DEPLOY_WEBHOOK_URL`.
2. Trigger deployment webhook:
   ```yaml
   - name: Trigger Webhook Deploy
     run: |
       curl -X POST "${{ secrets.DEPLOY_WEBHOOK_URL }}"
   ```

---

## 7. Rollback Strategy

Because all container images and deployments are tagged with the immutable Git commit SHA:

1. **Locate Target SHA**: Identify the last known healthy commit SHA from release history or git log.
2. **Instant Rollback via Dispatch**:
   - Go to GitHub Actions → **EcoNext Continuous Deployment** → **Run workflow**.
   - Input the target healthy commit SHA into `image_tag`.
   - Execute deployment.
3. **Host Pull**: The deployment immediately pulls `ghcr.io/<owner>/<image>:<rollback-sha>` and replaces running containers.

---

## 8. Deployment Health Check Verification Contract

When deployed, the verification suite validates the following system endpoints:

| Service | Protocol / Port | Endpoint | Expected Health Output |
|---|---|---|---|
| Django Backend | HTTP / 8000 | `GET /` | `HTTP 200` JSON `{"message": "Welcome to EcoNext API", "version": "1.0.0"}` |
| Products Catalog | HTTP / 8000 | `GET /api/products/` | `HTTP 200` JSON list |
| API Gateway | HTTP / 8080 | `GET /actuator/health` | `HTTP 200` JSON `{"status": "UP"}` |
| Auth Service | HTTP / 8081 | `GET /actuator/health` | `HTTP 200` JSON `{"status": "UP"}` |
| Catalog Service | HTTP / 8082 | `GET /actuator/health` | `HTTP 200` JSON `{"status": "UP"}` |
| Cart Service | HTTP / 8083 | `GET /actuator/health` | `HTTP 200` JSON `{"status": "UP"}` |
| Order Service | HTTP / 8084 | `GET /actuator/health` | `HTTP 200` JSON `{"status": "UP"}` |
| Admin Staff Service | HTTP / 8085 | `GET /actuator/health` | `HTTP 200` JSON `{"status": "UP"}` |
| Data Import Service | HTTP / 8086 | `GET /actuator/health` | `HTTP 200` JSON `{"status": "UP"}` |
| Payment Service | HTTP / 8087 | `GET /actuator/health` | `HTTP 200` JSON `{"status": "UP"}` |
| Notification Service | HTTP / 8089 | `GET /actuator/health` | `HTTP 200` JSON `{"status": "UP"}` |
| WebSocket STOMP | WS / 8084 | `/ws-tracking` | STOMP connection handshake established |
| Customer Frontend | HTTP / 80/443 | `GET /` | `HTTP 200` HTML document |
| Admin Frontend | HTTP / 80/443 | `GET /` | `HTTP 200` HTML document |
