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
| **Don't Expose MongoDB Publicly** | ✅ Verified | `compose.prod.yaml` leaves MongoDB with no exposed host ports, keeping it isolated inside the private `mern-network`. |
| **Don't Expose Backend Publicly** | ✅ Verified | `compose.prod.yaml` leaves Backend with no exposed host ports; all external access must pass through Nginx reverse proxy. |
| **HTTPS / SSL Configuration** | ✅ Template Ready | Provided `nginx.ssl.conf.example` with HTTP-to-HTTPS 301 redirection, modern TLS 1.2/1.3 ciphers, and HSTS headers. |

---

## 🧪 2. Automated Application Testing

All 24 automated integration tests run via `npm test` in `backend/`:

| Test Suite | Test Cases Covered |
|---|---|
| **API Health Checks** | `GET /api/v1/health` (200 OK), `GET /api/v2/health` with live uptime & ISO timestamp. |
| **Registration** | Successful regular user creation (201), admin creation (201), duplicate email check (409 Conflict), invalid email format (400), short password (400). |
| **Login** | Successful login with token issuance (200), invalid password (401), non-existent email (401), missing fields (400). |
| **Logout** | Explicit `POST /api/v1/auth/logout` endpoint returning 200 acknowledgment. |
| **JWT Authentication** | Accessing `/api/v1/auth/profile` with valid token (200), missing token (401), tampered/invalid token (401), expired token (401). |
| **Role-Based Authorization** | Regular user accessing `/api/v1/auth/admin` returns 403 Forbidden; admin user accessing route returns 200 OK with system statistics. |
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
- **Reproducible Installs**: Dockerfiles use `npm ci` (`npm ci --omit=dev` for backend production).

---

## 🐳 4. Docker Production Architecture

```
[ Internet / Clients ]
         │
         ▼  (Port 80 / 443)
┌──────────────────────────────────────────────┐
│  frontend-prod-container (Nginx Reverse Proxy)│
│  - Serves static Vite React SPA             │
│  - Reverse proxies /api/ -> backend:5000     │
│  - Security headers & Gzip compression       │
└──────────────────────┬───────────────────────┘
                       │ (mern-network only)
                       ▼
┌──────────────────────────────────────────────┐
│  backend-prod-container (Node.js API)        │
│  - Runs as non-root user (USER node)         │
│  - NODE_ENV=production                       │
│  - Rate limiting & Helmet & Zod validation   │
│  - No host ports exposed                     │
└──────────────────────┬───────────────────────┘
                       │ (mern-network only)
                       ▼
┌──────────────────────────────────────────────┐
│  mongo-prod-container (MongoDB 7.0)          │
│  - Pinned image: mongo:7.0                   │
│  - Persistent volume: mongo-data-prod        │
│  - No host ports exposed                     │
└──────────────────────────────────────────────┘
```

- **Resource Limits**:
  - `mongo`: 1 CPU, 1GB RAM
  - `backend`: 0.5 CPU, 512MB RAM
  - `frontend`: 0.25 CPU, 128MB RAM
- **Restart Policy**: `unless-stopped` across all containers.
- **Healthchecks**: Configured for all containers (`mongosh ping`, `wget` backend `/api/v1/health`, `wget` frontend `/`).

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
