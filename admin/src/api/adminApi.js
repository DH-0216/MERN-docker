import axios from "axios";

const adminApi = axios.create({
  baseURL: "/api/v1",
  timeout: 15000,
  withCredentials: true,
});

// In-memory admin token management
let inMemoryAdminToken = localStorage.getItem("adminAuthToken");

export const setAdminAuthToken = (token) => {
  inMemoryAdminToken = token;
  if (token) {
    localStorage.setItem("adminAuthToken", token);
  } else {
    localStorage.removeItem("adminAuthToken");
  }
};

// Attach Authorization header automatically if admin token exists
adminApi.interceptors.request.use((config) => {
  const token = inMemoryAdminToken || localStorage.getItem("adminAuthToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh token queue handling for concurrent 401s
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercept 401s to handle automatic token refresh
adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return adminApi(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post("/api/v1/auth/refresh", {}, { withCredentials: true });
        const newToken = res.data?.data?.token;

        setAdminAuthToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return adminApi(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAdminAuthToken(null);
        localStorage.removeItem("adminUserData");

        const base = import.meta.env.BASE_URL || "/";
        const loginPath = `${base}login`.replace(/\/+/g, "/");
        if (!window.location.pathname.endsWith("/login")) {
          window.location.href = loginPath;
        }

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export const authService = {
  login: (email, password) =>
    adminApi.post("/auth/login", { email, password }),
  refresh: () => adminApi.post("/auth/refresh"),
  logout: () => adminApi.post("/auth/logout"),
  getProfile: () => adminApi.get("/auth/profile"),
};

export const adminService = {
  getStats: () => adminApi.get("/admin/stats"),
  getUsers: (params) => adminApi.get("/admin/users", { params }),
  createUser: (data) => adminApi.post("/admin/users", data),
  updateRole: (userId, role) =>
    adminApi.patch(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => adminApi.delete(`/admin/users/${userId}`),
  checkV2Health: () => axios.get("/api/v2/health"),
  checkV1Health: () => axios.get("/api/v1/health"),
};

export const formatApiError = (
  error,
  fallback = "An unexpected error occurred. Please try again.",
) => {
  if (!error) return fallback;

  // 1. Prefer explicit server response message (e.g. from backend errorHandler or controllers)
  const serverMessage = error.response?.data?.message;
  if (serverMessage && typeof serverMessage === "string") {
    return serverMessage;
  }

  // 2. Map HTTP status codes to user-friendly messages instead of raw status strings
  const status = error.response?.status;
  if (status === 401) {
    return "Invalid email or password. Please verify your administrator credentials.";
  }
  if (status === 403) {
    return "Access Denied: Your account does not have administrator privileges.";
  }
  if (status === 404) {
    return "The requested record or resource was not found.";
  }
  if (status === 409) {
    return "A user with this email or username already exists.";
  }
  if (status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (status && status >= 500) {
    return "The server encountered an error. Please try again shortly.";
  }

  // 3. Custom thrown errors (like client-side role validation)
  if (
    error.message &&
    typeof error.message === "string" &&
    !error.message.includes("status code") &&
    !error.message.includes("Network Error")
  ) {
    return error.message;
  }

  if (error.message === "Network Error" || !error.response) {
    return "Unable to connect to the server. Please verify the backend is running.";
  }

  return fallback;
};

export default adminApi;
