# Production Readiness & Security Checklist

This document details all implemented production-readiness controls, verification steps, and operational guidelines for deploying the MERN Docker stack to production.

---

## 🔒 1. Security & Hardening

| Control | Status | Implementation Details |
|---|---|---|
| **Rate Limiting** | ✅ Implemented | Applied general rate limiter across `/api` (100 requests per 15 minutes) via `express-rate-limit`. |
| **Strict Auth Rate Limiting** | ✅ Implemented | Applied strict rate limiter (10 attempts / 15 min) on `/api/v1/auth/login` and `/api/v1/auth/register` to prevent brute-force attacks. |
| **Helmet / Security Headers** | ✅ Implemented | Backend uses `helmet()` middleware; Frontend Nginx enforces `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and CSP. |
| **Input Validation** | ✅ Implemented | Strict schema validation via `zod` (`registerSchema` and `loginSchema`) sanitizing username, email normalization, and password requirements. |
| **Authentication Checks** | ✅ Implemented | `authenticate` middleware verifies JWT signatures and ensures the user exists in MongoDB before granting route access. |
| **Authorization / Role Checks** | ✅ Implemented | Added `role` (`user` \| `admin`) to User model and `authorize(...roles)` RBAC middleware protecting `/api/v1/auth/admin` with 403 Forbidden checks. |
| **JWT Security** | ✅ Implemented | Pinned `algorithm: "HS256"`, 1-hour token expiration, and non-sensitive payload storage (`id`, `email`, `role`). |
| **Secure Password Hashing** | ✅ Implemented | Passwords hashed using `bcryptjs` with 12 salt rounds; `select: false` ensures hashed passwords are never returned in queries or serialized JSON. |
| **CORS Configuration** | ✅ Implemented | Dynamic origin checking with whitelist configuration via `ALLOWED_ORIGINS` environment variable and credentials support. |
| **Request Body Size Limits** | ✅ Implemented | Enforced explicit `10kb` body size limit on `express.json` and `express.urlencoded`, returning HTTP 413 on oversized payloads. |
| **Production Error Handling** | ✅ Implemented | Centralized error handler masks internal 500 error messages and completely hides stack traces when `NODE_ENV=production`. |
| **Prevent Sensitive Info Leaks** | ✅ Implemented | Mongoose database errors, duplicate keys, and cast errors are caught and returned as clean, sanitized messages without leaking system internals. |
| **Protect Sensitive Env Vars** | ✅ Implemented | `src/config/env.js` validates `JWT_SECRET`, `MONGO_URI`, and `PORT` on startup, failing fast if critical variables are missing or insecure. |
| **Rotate Exposed Secrets** | ✅ Implemented | Fresh cryptographically generated 256-bit random hex secrets configured for dev and production `.env` files. |
| **Don't Commit .env Files** | ✅ Verified | `.gitignore` explicitly ignores `.env` and `.env.*` (only `.env.example` and `.env.production.example` are tracked). |
| **Don't Include Secrets in Images** | ✅ Verified | `.dockerignore` in root, backend, and frontend excludes all `.env*` files from Docker build contexts. |
| **Don't Expose MongoDB Publicly** | ✅ Verified | `compose.prod.yaml` leaves MongoDB on `backend-network` (internal) with no exposed host ports. |
| **Don't Expose Backend Publicly** | ✅ Verified | `compose.prod.yaml` leaves Backend with no exposed host ports; all external access must pass through Nginx reverse proxy. |
| **MongoDB Authentication** | ✅ Implemented | `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` enforced via environment variables; `MONGO_URI` includes `?authSource=admin`. |
| **No New Privileges** | ✅ Implemented | `security_opt: ["no-new-privileges:true"]` enforced across all services in `compose.prod.yaml` to prevent container privilege escalation. |
| **Read-Only Root Filesystem** | ✅ Implemented | `read_only: true` on backend and frontend containers; writable paths limited to explicit `tmpfs` mounts (`/tmp`, `/var/cache/nginx`, `/var/run`). |
| **Two-Tier Network Isolation** | ✅ Implemented | `frontend-network` (frontend ↔ backend) and `backend-network` (backend ↔ mongo, `internal: true`). MongoDB has zero internet access. |
| **PID 1 Signal & Zombie Handling** | ✅ Implemented | `init: true` enabled on Node.js backend container to ensure proper Tini init reaping and graceful `SIGTERM` shutdown handling. |
| **Graceful Shutdown** | ✅ Implemented | `stop_grace_period: 30s` on backend container to allow in-flight requests to complete before `SIGKILL`. |
| **Fork Bomb Protection** | ✅ Implemented | `pids_limit` set on all containers (backend: 100, frontend: 50, mongo: 200) to prevent fork bomb attacks. |
| **Proper File Ownership** | ✅ Implemented | `COPY --chown=node:node` in backend `Dockerfile.prod` ensures the `node` user owns all application files. |
| **Pinned Image Versions** | ✅ Implemented | `node:20-alpine`, `mongo:7.0`, `nginx:1.27-alpine` — no floating `:latest` tags. |
| **OCI Image Labels** | ✅ Implemented | `LABEL org.opencontainers.image.*` metadata in production Dockerfiles for registry traceability. |
| **Dockerfile-Level Healthchecks** | ✅ Implemented | `HEALTHCHECK` instructions in both `Dockerfile.prod` files for standalone runtime compatibility (Kubernetes, ECS). |
| **Static Cache Strategy** | ✅ Implemented | Nginx enforces `Cache-Control: no-store, no-cache, must-revalidate` on `/index.html` and 1-year immutable caching on hashed assets (`/assets/`). |
| **Dotfile / Hidden File Protection** | ✅ Implemented | Nginx strictly denies and returns 404 on any requests matching `/\.` (e.g., `.env`, `.git`). |
| **Lightweight Health Probes** | ✅ Implemented | Dedicated `location = /healthz` endpoint in Nginx for zero-overhead container and load balancer health probes. |
| **HTTPS / SSL Configuration** | ✅ Template Ready | Provided `nginx.ssl.conf.example` with HTTP-to-HTTPS 301 redirection, modern TLS 1.2/1.3 ciphers, and HSTS headers. |

---

## 🧪 2. Automated Application Testing

All 28 automated integration tests run via `npm test` in `backend/`:

| Test Suite | Test Cases Covered |
|---|---|
| **API Health Checks** | `GET /api/v1/health` (200 OK), `GET /api/v2/health` with live uptime & ISO timestamp. |
| **Registration** | Successful regular user creation (201), admin creation (201), duplicate email check (409 Conflict), invalid email format (400), short password (400). |
| **Login** | Successful login with token issuance (200), invalid password (401), non-existent email (401), missing fields (400). |
| **Logout** | Explicit `POST /api/v1/auth/logout` endpoint returning 200 acknowledgment. |
| **JWT Authentication** | Accessing `/api/v1/auth/profile` with valid token (200), missing token (401), tampered/invalid token (401), expired token (401). |
| **Role-Based Authorization** | Regular user accessing `/api/v1/auth/admin` returns 403 Forbidden; admin user accessing route returns 200 OK with system statistics. |
| **Account Deletion** | Authenticated user self-deletion via `DELETE /api/v1/auth/profile` and alias `/account` (200), database record removal verification, and unauthenticated deletion rejection (401). |
| **Request Body Limits** | Request bodies > 10kb return HTTP 413 Payload Too Large. |
| **404 Handling** | Non-existent routes return structured 404 JSON. |
| **Security Headers** | Verified `x-frame-options`, `x-content-type-options` present in responses. |
| **Rate Limiting** | Exceeding auth limit triggers HTTP 429 Too Many Requests. |
| **Database Error Handling** | Invalid ObjectId queries handled cleanly without server crash. |
| **Production Error Masking** | Stack traces and database internals omitted in production mode. |

---

## 📦 3. Dependencies

- **Audit**: Backend and frontend verified with 0 vulnerabilities (`npm audit`).
- **Unused Packages Removed**: Removed unused `axios` from backend `package.json`.
- **Node.js LTS**: Pinned to Node 20 LTS Alpine (`node:20-alpine`) across Dockerfiles.
- **Nginx Pinned**: Client production image pinned to `nginx:1.27-alpine`.
- **MongoDB Pinned**: Both dev and prod compose files pin `mongo:7.0`.
- **Reproducible Installs**: Dockerfiles use `npm ci` (`npm ci --omit=dev` for server production) with `npm cache clean --force`.

---

## 🐳 4. Docker Production Architecture

```
 [ Internet / Clients ]
          │
          ▼  (Port 8080 → 80)
┌─────────────────────────────────────────────────┐
│  client-prod-container (Nginx 1.27)             │
│  - Serves static Vite React SPA                 │
│  - Reverse proxies /api/ → server:5000          │
│  - Security headers & Gzip compression          │
│  - read_only filesystem, pids_limit: 50         │
│  📡 client-network                              │
└──────────────────────┬──────────────────────────┘
                       │ (client-network)
                       ▼
┌─────────────────────────────────────────────────┐
│  server-prod-container (Node.js API)            │
│  - Runs as non-root user (USER node)            │
│  - init: true, stop_grace_period: 30s           │
│  - read_only filesystem, pids_limit: 100        │
│  - No host ports exposed                        │
│  📡 client-network + backend-network            │
└──────────────────────┬──────────────────────────┘
                       │ (backend-network, internal)
                       ▼
┌─────────────────────────────────────────────────┐
│  mongo-prod-container (MongoDB 7.0)             │
│  - Authenticated (MONGO_INITDB_ROOT_*)          │
│  - Persistent volume: mongo-data-prod           │
│  - No host ports, no internet (internal network)│
│  - pids_limit: 200                              │
│  📡 backend-network only                        │
└─────────────────────────────────────────────────┘
```

- **Resource Limits**:
  - `mongo`: 1 CPU, 1GB RAM, 200 PIDs
  - `server`: 0.5 CPU, 512MB RAM, 100 PIDs
  - `client`: 0.25 CPU, 128MB RAM, 50 PIDs
- **Restart Policy**: `unless-stopped` across all containers.
- **Network Isolation**: Two-tier network — `client-network` (client ↔ server) and `backend-network` (`internal: true`, server ↔ mongo). MongoDB has zero internet access.
- **Read-Only Filesystems**: `read_only: true` on server and client. Writable paths limited to explicit `tmpfs` mounts.
- **MongoDB Authentication**: `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` environment variables with `?authSource=admin` in connection string.
- **Security & Privilege Hardening**: `security_opt: ["no-new-privileges:true"]` on all containers.
- **Process Supervision (`init: true`)**: Server runs with Tini for signal forwarding and zombie reaping; `stop_grace_period: 30s` for graceful shutdown.
- **Healthchecks**: All containers (`mongosh ping`, `wget` server `/api/v1/health`, `wget` client `/healthz`). Also defined via `HEALTHCHECK` in Dockerfiles for standalone runtime compatibility.
- **Static File Caching & Security**: Nginx enforces cache-busting on `index.html`, 1-year immutable caching on Vite assets, and blocks dotfiles.
- **Log Rotation**: Capped at 10MB per file with 3 rotating files across all services.
- **OCI Labels**: Production Dockerfiles carry `org.opencontainers.image.*` metadata for registry traceability.

---

## 🌐 5. Production Infrastructure Guide

### A. Firewall Configuration (UFW on Ubuntu/Debian)
Ensure only required ports are open to the public internet:
```bash
# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (ensure you don't lock yourself out)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS only
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status verbose
```
> [!IMPORTANT]
> Never open ports `5000` (backend) or `27017` (MongoDB) in your firewall or cloud security group. They should remain strictly accessible inside Docker's internal network.

### B. HTTPS / SSL Provisioning with Let's Encrypt & Certbot
1. Point your domain DNS records (A record) to your server's public IP.
2. Install Certbot:
   ```bash
   sudo apt update && sudo apt install -y certbot
   ```
3. Issue a certificate:
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
   ```
4. Copy `nginx.ssl.conf.example` to your frontend configuration, updating your domain name.
5. In `compose.prod.yaml`, mount the certificates into the frontend container:
   ```yaml
   volumes:
     - /etc/letsencrypt:/etc/letsencrypt:ro
   ```

### C. MongoDB Backup Strategy
Automated backups are provided by [`scripts/backup-mongo.sh`](file:///c:/Users/dulaj/Desktop/Learning/Docker/MERN-docker/scripts/backup-mongo.sh).
To schedule daily backups at 02:00 AM with a 7-day retention rotation:
```bash
crontab -e
# Add the following line:
0 2 * * * /path/to/MERN-docker/scripts/backup-mongo.sh >> /var/log/mongo-backup.log 2>&1
```
To test or restore a backup:
```bash
./scripts/restore-mongo.sh ./backups/mongo/dockerDB_YYYYMMDD_HHMMSS.archive.gz
```

### D. Application Logs & Monitoring
- Inspect real-time production container logs:
  ```bash
  docker compose -f compose.prod.yaml logs -f --tail=100
  ```
- Inspect container resource usage:
  ```bash
  docker stats
  ```
- Inspect container health status:
  ```bash
  docker compose -f compose.prod.yaml ps
  ```
