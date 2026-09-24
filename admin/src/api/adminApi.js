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

export default adminApi;
