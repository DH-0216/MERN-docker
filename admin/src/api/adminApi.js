import axios from "axios";

const adminApi = axios.create({
  baseURL: "/api/v1",
  timeout: 15000,
});

// Attach Authorization header automatically if admin token exists
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminAuthToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401s to handle token expiration
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminAuthToken");
      localStorage.removeItem("adminUserData");
      // If we are not already on the login page, redirect
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export const authService = {
  login: (email, password) =>
    adminApi.post("/auth/login", { email, password }),
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
