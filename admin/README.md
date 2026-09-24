# MERN Admin Dashboard & Control Portal

An administrative dashboard built with **React 19**, **Vite**, **Tailwind CSS v4**, and **Lucide React**, integrated into the multi-container MERN Docker infrastructure.

---

## 🌟 Key Features

- **Role-Based Access Control (RBAC)**: Exclusively accessible to accounts with `role === "admin"`. Regular users are automatically denied access.
- **Executive Metrics**: Live KPI cards for Total Users, Admins, Standard Users, System Uptime, and Memory Consumption (RSS / Heap).
- **User Management**:
  - Full CRUD control with search and role filters.
  - Promote regular members to administrators or demote admins.
  - Safe account deletion with safeguard preventing admins from deleting or demoting their own active session.
  - Direct user registration modal from the dashboard.
- **System Health & Diagnostics**:
  - Live API benchmark tool testing `/api/v1/health`, `/api/v2/health`, and `/api/v1/admin/stats` with response latency in milliseconds.
  - Memory gauges tracking V8 heap usage and total allocation.
  - MongoDB connection state monitor.
- **Microservice Mapping**: Seamless proxy routing (`/api`) to the Express backend.

---

## 🚀 Running the Admin Dashboard

### Option 1: Via Docker Compose (Recommended)

From the project root:

```bash
docker compose up --build
```

- **Admin Portal**: [http://localhost:5174](http://localhost:5174)
- **Client App**: [http://localhost:5173](http://localhost:5173)
- **Server API**: [http://localhost:5000](http://localhost:5000)

### Option 2: Local Development

```bash
cd admin
npm install
npm run dev
```

The app will start at `http://localhost:5174` and proxy `/api/*` requests to `http://localhost:5000`.

---

## 🛡️ Authentication & Role Guard

Only users registered with the `admin` role can log in to this portal:

1. Create an admin user via the API or dashboard:
   - Endpoint: `POST /api/v1/auth/register` with `role: "admin"`
2. Sign in at `http://localhost:5174/login`.
