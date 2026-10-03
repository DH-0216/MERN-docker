# Enterprise MERN Docker Stack

An enterprise-ready, fully containerized MERN (MongoDB, Express, React, Node.js) application architecture hardened for production with Redis, Nginx reverse proxy, automated background job queues, distributed rate limiting, and NIST-compliant security.

---

## 📑 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Key Features](#-key-features)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Environment Configuration](#-environment-configuration)
- [Quick Start (Development)](#-quick-start-development)
- [Production Deployment](#-production-deployment)
- [Security & Resilience](#-security--resilience)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [API Reference](#-api-reference)
- [Useful Commands (Makefile)](#-useful-commands-makefile)
- [License](#-license)

---

## 🏛 Architecture Overview

```
                                      +---------------------------------------------+
                                      |                 Internet                    |
                                      +---------------------------------------------+
                                                             |
                                                             v [Port 80 / 443]
                                              +-----------------------------+
                                              |      Nginx Reverse Proxy    |
                                              |  (Gzip, Cache, X-Request-ID)|
                                              +-----------------------------+
                                               /             |             \
                          /admin/             /              |              \   /assets/ & /*
         +-----------------------------------+               |               +-----------------------------------+
         |                                                   v /api/                                             |
         v                                    +-----------------------------+                                    v
+------------------+                          |    Node.js / Express API    |                          +------------------+
| Admin Dashboard  |                          |  (Pino JSON, RBAC, Val.)    |                          |   User Portal    |
| (React 19, Vite) |                          +-----------------------------+                          | (React 19, Vite) |
+------------------+                             /                       \                             +------------------+
                                                v                         v
                                   +-----------------------+   +-----------------------+
                                   |      MongoDB 7.0      |   |        Redis 7        |
                                   | (Compound Indexing,   |   | (Token Blacklist,     |
                                   |  Data Persistence)    |   |  Dual-Key Rate Limit, |
                                   +-----------------------+   |  Presence, Job Queue, |
                                                               |  DLQ & Cache)         |
                                                               +-----------------------+
```

### Components

| Service | Technology | Role / Responsibility | Port (Dev) | Port (Prod) |
|---|---|---|---|---|
| **main-nginx** | Nginx 1.27 Alpine | Edge Gateway, SSL termination, Gzip, static asset caching, `X-Request-ID` generation | N/A | `80` (or `443`) |
| **server** | Express 5, Node.js | Backend REST API, business logic, authentication, job dispatching | `5000` | Internal (`5000`) |
| **client** | React 19, Vite, Tailwind v4 | Customer-facing SPA web portal | `5173` | Internal (`80`) |
| **admin** | React 19, Vite, Tailwind v4 | Operations and Administration Dashboard (RBAC metrics, user management) | `5174` | Internal (`80`) |
| **mongo** | MongoDB 7.0 | Primary document database with compound indexing for queries | `27017` | Internal (`27017`) |
| **redis** | Redis 7 Alpine | Distributed cache, active presence, refresh token rotation, job queue & DLQ | `6379` | Internal (`6379`) |

---

## ✨ Key Features

### 🛡️ Advanced Security & Authentication
- **Dual-Key Brute Force Defense:** 
  - IP-based rate limiting (10 attempts per 15 min).
  - Target Account lockout (`rl:account:<email>`: 5 failed attempts per 15 min) with automatic counter reset upon successful authentication.
- **NIST SP 800-63B Password Complexity:** Minimum 8 characters, uppercase, lowercase, digit, special symbol enforcement, and screening against common breached passwords blacklist.
- **Enterprise Session & Refresh Tokens:** High-entropy JWT access tokens + Redis-backed `httpOnly` secure refresh cookies with automatic rotation and token-family revocation on replay detection.
- **Immediate JWT Blacklisting:** Stateless access tokens are instantly revoked upon logout via Redis TTL blacklisting.
- **Strict RBAC:** Role-Based Access Control protecting sensitive administrative actions.

### ⚡ Performance & Scalability
- **MongoDB Compound Indexing:** Optimized binary-tree index on `{ role: 1, createdAt: -1 }` accelerating administrative queries and filtering from $O(N)$ table scans to $O(\log N)$.
- **Edge Static Asset Caching:** 1-year immutable cache headers (`max-age=31536000, immutable`) for Vite hashed bundles (`/assets/*`).
- **Nginx Gzip Compression:** Compresses text, JSON, CSS, JavaScript, and XML payloads, reducing wire payload sizes by 60%–75%.
- **Redis Multi-tier Caching:** System statistics and user lookups cached in Redis with non-blocking pattern invalidation (`SCAN` instead of blocking `KEYS`).

### 📊 Observability & Operations
- **Request Correlation IDs (`X-Request-ID`):** End-to-end tracing assigned by Nginx or generated by Express, propagated through every log entry, response header, and error handler.
- **Structured JSON Logging:** Pino-based structured JSON stdout logging for AWS CloudWatch, Datadog, or Grafana Loki ingestion.
- **Production Job Queue & Dead-Letter Queue (DLQ):** Background job worker with 3 automatic retries and exponential backoff (`[5s, 15s, 60s]`). Exhausted jobs are routed to Dead-Letter Queue (`queue:dlq:<queueName>`) with replay and inspection APIs.
- **Real-time User Presence:** Tracks and queries active concurrent user counts via Redis sorted sets.

---

## 📁 Project Structure

```
.
├── admin/                      # Operations Admin Dashboard (React + Vite)
│   ├── src/                    # Admin views, components, and API integration
│   ├── nginx.conf              # Production Nginx configuration for Admin container
│   ├── Dockerfile              # Multi-stage Docker build
│   └── vite.config.js          # Vite config (base: /admin/)
├── client/                     # Customer Web Portal (React + Vite)
│   ├── src/                    # Customer views and authentication flows
│   ├── nginx.conf              # Production Nginx configuration for Client container
│   ├── Dockerfile              # Multi-stage Docker build
│   └── vite.config.js          # Vite config
├── server/                     # Backend Express API
│   ├── src/
│   │   ├── config/             # DB, Redis, Logger (Pino), and Environment configs
│   │   ├── controllers/        # Request controllers (auth, admin)
│   │   ├── middleware/         # Rate limiting, validation, error, and auth middleware
│   │   ├── models/             # Mongoose schemas (User with compound indexes)
│   │   ├── routes/             # Express API routing (v1, v2)
│   │   └── services/           # Business logic, caching, queues, presence
│   ├── scripts/                # Database seeding scripts (seedAdmin.js)
│   ├── tests/                  # Node.js native test runner integration suites (61 tests)
│   └── Dockerfile              # Production multi-stage Node.js build
├── main-nginx.conf             # Production edge gateway configuration
├── compose.yaml                # Local development stack with live reloading
├── compose.prod.yaml           # Hardened production stack with resource limits & networks
├── Makefile                    # Cross-platform automation commands
├── make.cmd / make.ps1         # Windows native wrappers for Make
└── README.md                   # Project documentation
```

---

## 📦 Prerequisites

Ensure you have the following installed on your host machine:

- **Docker:** `v24.0+`
- **Docker Compose:** `v2.20+`
- **Node.js (Optional, for local development/testing):** `v20.0+` or `v22.0+`
- **Make (Optional):** Available natively on Linux/macOS, or via `make.cmd` / `make.ps1` on Windows

---

## ⚙️ Environment Configuration

Copy the example environment files:

```bash
# Development environment file
cp .env.example .env

# Production environment file
cp .env.prod.example .env.prod
```

### Key Environment Variables

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Node server port | `5000` |
| `MONGO_URI` | MongoDB connection URI | `mongodb://mongo:27017/dockerDB` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` |
| `JWT_SECRET` | Secret key for signing access JWTs (min 32 chars) | Random 64-char string |
| `JWT_EXPIRES_IN` | Access token lifespan | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh cookie lifespan | `30d` |
| `ADMIN_USERNAME` | Initial seeded administrator username | `superadmin` |
| `ADMIN_EMAIL` | Initial seeded administrator email | `admin@example.com` |
| `ADMIN_PASSWORD` | Initial seeded administrator password (NIST compliant) | `Admin123456!` |

> [!WARNING]
> **Production Security:** Never deploy with default secrets or passwords! Generate a unique 64-character `JWT_SECRET` (`openssl rand -hex 32`), and set strong, distinct passwords for `MONGO_PASSWORD` and `ADMIN_PASSWORD` in `.env.prod`. Real `.env` and `.env.prod` files are explicitly excluded by `.gitignore` and should never be committed to source control.

---

## 🚀 Quick Start (Development)

Start the entire development stack with hot-reloading:

```bash
# Using Makefile
make dev

# Or directly using Docker Compose
docker compose up -d
```

### Accessing Local Services

- **User Portal (Client):** [http://localhost:5173](http://localhost:5173)
- **Admin Dashboard:** [http://localhost:5174](http://localhost:5174)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **API Health Check:** [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

### Seed Initial Admin User

To create the initial admin account:

```bash
make seed-admin
# or
docker compose exec server npm run seed:admin
```

Credentials configured by default:
- **Email:** `admin@example.com`
- **Password:** `Admin123456!`

---

## 🚢 Production Deployment

The production deployment uses `compose.prod.yaml` featuring:
- Isolated Docker networks (`client-network` and `backend-network`).
- Edge Nginx reverse proxy on port `80` (or `443` with SSL).
- Resource constraints (`cpus`, `mem_limit`, `pids_limit`, `no-new-privileges: true`).
- Gzip compression and 1-year immutable caching for Vite static assets.

### Start Production Stack

```bash
# Build and launch production containers
make prod-build

# Or directly using Docker Compose
docker compose -f compose.prod.yaml --env-file .env.prod up --build -d
```

### Accessing Production Endpoints

All traffic is routed through the single entry gateway:

- **Customer Frontend:** `http://localhost/`
- **Admin Dashboard:** `http://localhost/admin/`
- **Backend REST API:** `http://localhost/api/v1/...`
- **Gateway Health Check:** `http://localhost/healthz`

### 🔄 Automated Health Check & Rollback

The production deployment pipeline (`.github/workflows/deploy.yml` and `scripts/deploy.sh`) provides zero-downtime resilience:
1. **Active Image Snapshot:** Before pulling updates, currently running images are backed up locally with the `:rollback-backup` tag.
2. **Deterministic Startup:** Starts updated containers with `docker compose up -d --wait` (Compose verifies internal Docker health checks before exiting).
3. **Live HTTP Probes:** Probes `http://127.0.0.1/api/v1/health` and `http://127.0.0.1/` through the Nginx gateway (retrying up to 12 attempts).
4. **Instant Rollback:** If any probe or container fails, the pipeline dumps recent server error logs, immediately re-launches the `:rollback-backup` image family, and exits with code 1 to alert GitHub Actions.
5. **Safe Cleanup:** Only prunes dangling images if the deployment and all health checks pass.

---

## 🔒 Security & Resilience

### 1. Dual-Key Rate Limiting
- Every authentication attempt is checked against the client IP (`rl:auth:<ip>`) and the normalized target email (`rl:account:<email>`).
- If an attacker rotates proxy IPs to brute-force a specific account, the account is temporarily frozen for 15 minutes after 5 consecutive failures.
- Legitimate users automatically clear their failed attempt counter upon successful login.

### 2. Request Correlation IDs
Every request is stamped with an `X-Request-ID` header. Structured JSON logs are formatted as follows:

```json
{
  "timestamp": "2026-10-03T00:26:15.120Z",
  "level": "info",
  "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "userId": "6701a2f4...",
  "method": "GET",
  "path": "/api/v1/admin/users?page=1&limit=10",
  "statusCode": 200,
  "responseTimeMs": 14
}
```

### 3. Background Job Queue & Dead-Letter Queue (DLQ)
- Asynchronous tasks (such as welcome emails) are dispatched into Redis-backed queues.
- If processing throws an error, the job retries up to 3 times with exponential backoff (`5s`, `15s`, `60s`).
- Exhausted jobs are moved to `queue:dlq:<queueName>` with error stacks for administrator inspection rather than being dropped silently.

---

## 🧪 Testing & Quality Assurance

The backend features a comprehensive integration and security test suite using Node.js's native test runner (`node --test`) and Supertest.

```bash
# Run test suite locally
cd server
npm test

# Or via Makefile
make test
```

### Test Coverage Highlights (61 Passing Tests)
- **Auth & Session Suite:** Registration, role tampering prevention, NIST password complexity, breached password rejection, login, JWT issuance, rotation, cookie clearance.
- **Security Suite:** Security headers (`Helmet`), payload body limits (10kb DoS prevention), sensitive error masking in production, dual-key IP + Account rate limiting.
- **Database Suite:** MongoDB compound indexing verification, duplicate key handling, invalid ObjectId cast handling.
- **Redis Suite:** Caching fallback, key deletion & pattern invalidation, real-time presence tracking, token blacklisting, job queue retries, and Dead-Letter Queue (DLQ) routing.

---

## 📡 API Reference

### Public Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Protection |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account | Rate limited, Schema validation |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue tokens | Dual-Key rate limit, Schema validation |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token & issue new JWT | Cookie verification |
| `POST` | `/api/v1/auth/logout` | Revoke session & blacklist JWT | Token verification |

### Protected User Routes (`/api/v1/auth`)

| Method | Endpoint | Description | Protection |
|---|---|---|---|
| `GET` | `/api/v1/auth/profile` | Retrieve authenticated user profile | Bearer JWT |
| `DELETE` | `/api/v1/auth/profile` | Permanently delete user account | Bearer JWT |

### Admin Dashboard & Management (`/api/v1/admin`)

| Method | Endpoint | Description | Protection |
|---|---|---|---|
| `GET` | `/api/v1/admin/stats` | Dashboard metrics & Redis health | Admin RBAC, Redis cache |
| `GET` | `/api/v1/admin/users` | Paginated, filterable user list | Admin RBAC, Compound index |
| `POST` | `/api/v1/admin/users` | Directly provision user accounts | Admin RBAC, NIST validation |
| `PATCH` | `/api/v1/admin/users/:id/role` | Promote/demote user roles | Admin RBAC (prevents self-demotion) |
| `DELETE` | `/api/v1/admin/users/:id` | Delete targeted user account | Admin RBAC (prevents self-deletion) |

### Health Checks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Lightweight backend healthcheck |
| `GET` | `/api/v2/health` | Extended healthcheck with Redis & uptime metrics |
| `GET` | `/healthz` | Nginx reverse proxy edge healthcheck |

---

## 🛠 Useful Commands (Makefile)

| Command | Action |
|---|---|
| `make help` | Display available make targets |
| `make dev` | Start development stack in detached mode |
| `make dev-build` | Rebuild images and start development stack |
| `make dev-logs` | Stream logs from all development containers |
| `make dev-down` | Stop development stack |
| `make prod` | Start production stack in detached mode |
| `make prod-build` | Rebuild images and start production stack |
| `make prod-logs` | Stream logs from production containers |
| `make prod-down` | Stop production stack |
| `make test` | Execute server test suite |
| `make seed-admin` | Seed initial administrator account |
| `make clean` | Stop containers, remove volumes and orphan images |
| `make shell-server` | Open bash shell in backend server container |
| `make shell-redis` | Open interactive Redis CLI (`redis-cli`) |
| `make shell-mongo` | Open interactive MongoDB shell (`mongosh`) |

*(On Windows without `make`, use `.\make.ps1 <command>` or `make.cmd <command>`)*

---

## 📄 License

This project is licensed under the ISC License.
