import axios from "axios";

const clientApi = axios.create({
  baseURL: "/api/v1",
  timeout: 15000,
});

// Automatically inject Authorization header if authToken exists
clientApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor for 401 handling
clientApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (email, password) =>
    clientApi.post("/auth/login", { email, password }),
  register: (userData) =>
    clientApi.post("/auth/register", userData),
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
