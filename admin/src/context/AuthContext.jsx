import { useState, useEffect, useCallback } from "react";
import { authService } from "../api/adminApi";
import { AuthContext } from "./authContextInstance";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() =>
    localStorage.getItem("adminAuthToken"),
  );
  const [adminUser, setAdminUser] = useState(() => {
    const cached = localStorage.getItem("adminUserData");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on app initialization
  const verifySession = useCallback(async () => {
    const storedToken = localStorage.getItem("adminAuthToken");
    if (!storedToken) {
      setAdminUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authService.getProfile();
      const userData = res.data?.data;

      if (userData?.role !== "admin") {
        throw new Error("Access restricted: Administrator role required.");
      }

      setAdminUser(userData);
      localStorage.setItem("adminUserData", JSON.stringify(userData));
    } catch {
      localStorage.removeItem("adminAuthToken");
      localStorage.removeItem("adminUserData");
      setAdminUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const { token: receivedToken, user } = res.data?.data || {};

    if (!user || user.role !== "admin") {
      throw new Error(
        "Access Denied: Your account does not have administrator privileges.",
      );
    }

    localStorage.setItem("adminAuthToken", receivedToken);
    localStorage.setItem("adminUserData", JSON.stringify(user));
    setToken(receivedToken);
    setAdminUser(user);
    return user;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network failures on logout
    } finally {
      localStorage.removeItem("adminAuthToken");
      localStorage.removeItem("adminUserData");
      setToken(null);
      setAdminUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        adminUser,
        isAuthenticated: !!token && adminUser?.role === "admin",
        isLoading,
        login,
        logout,
        refreshUser: verifySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
