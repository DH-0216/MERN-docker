import axios from "axios";

const clientApi = axios.create({
  baseURL: "/api/v1",
  timeout: 15000,
  withCredentials: true,
});

// Strictly In-Memory Access Token Management (OWASP compliant: no localStorage)
let inMemoryToken = null;

export const setClientAuthToken = (token) => {
  inMemoryToken = token;
};

export const getClientAuthToken = () => inMemoryToken;

// Automatically inject Authorization header if in-memory token exists
clientApi.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
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

// Global response interceptor for automatic 401 token refresh
clientApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt to refresh for auth endpoints that naturally return 401
    const isAuthRoute =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return clientApi(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post("/api/v1/auth/refresh", {}, { withCredentials: true });
        const newToken = res.data?.data?.token;

        setClientAuthToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return clientApi(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setClientAuthToken(null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

let refreshPromise = null;

export const authApi = {
  login: (email, password) =>
    clientApi.post("/auth/login", { email, password }),
  register: (userData) =>
    clientApi.post("/auth/register", userData),
  refresh: () => {
    if (!refreshPromise) {
      refreshPromise = clientApi.post("/auth/refresh").finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  },
  logout: () =>
    clientApi.post("/auth/logout"),
  getProfile: () =>
    clientApi.get("/auth/profile"),
  deleteAccount: () =>
    clientApi.delete("/auth/profile"),
  testAdminRbac: () =>
    clientApi.get("/auth/admin"),
};

export const healthApi = {
  getHealth: (version = "v1") =>
    axios.get(`/api/${version}/health`),
};

export const formatClientApiError = (
  error,
  fallback = "An unexpected error occurred. Please try again.",
) => {
  if (!error) return fallback;

  const serverMessage = error.response?.data?.message;
  if (serverMessage && typeof serverMessage === "string") {
    return serverMessage;
  }

  const status = error.response?.status;
  if (status === 401) {
    return "Invalid email or password. Please try again.";
  }
  if (status === 403) {
    return "Access Denied: You do not have permission to view this resource.";
  }
  if (status === 404) {
    return "The requested record was not found.";
  }
  if (status === 409) {
    return "An account with this email or username already exists.";
  }
  if (status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (status && status >= 500) {
    return "The server encountered an issue. Please try again shortly.";
  }

  if (
    error.message &&
    typeof error.message === "string" &&
    !error.message.includes("status code") &&
    !error.message.includes("Network Error")
  ) {
    return error.message;
  }

  if (error.message === "Network Error" || !error.response) {
    return "Unable to connect to the server. Please verify your connection.";
  }

  return fallback;
};

export default clientApi;
