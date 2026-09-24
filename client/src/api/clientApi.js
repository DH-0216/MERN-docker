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

export default clientApi;
