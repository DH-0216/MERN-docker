import { useState, useEffect, useCallback } from "react";
import { authService, setAdminAuthToken } from "../api/adminApi";
import { AuthContext } from "./authContextInstance";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on app initialization via silent refresh & profile verification
  const verifySession = useCallback(async () => {
    try {
      // Attempt silent refresh via httpOnly cookie in Redis
      const refreshRes = await authService.refresh();
      const freshToken = refreshRes.data?.data?.token;
      const refreshedUser = refreshRes.data?.data?.user;

      if (!freshToken) {
        setAdminAuthToken(null);
        setAdminUser(null);
        setToken(null);
        return;
      }

      setAdminAuthToken(freshToken);
      setToken(freshToken);

      // Fetch fresh profile or use user data from refresh response
      let userData = refreshedUser;
      if (!userData) {
        const res = await authService.getProfile();
        userData = res.data?.data;
      }

      if (userData?.role !== "admin") {
        throw new Error("Access restricted: Administrator role required.");
      }

      setAdminUser(userData);
    } catch {
      setAdminAuthToken(null);
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

    setAdminAuthToken(receivedToken);
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
      setAdminAuthToken(null);
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
