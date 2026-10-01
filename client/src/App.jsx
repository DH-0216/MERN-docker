import { useState, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import { authApi, setClientAuthToken } from "./api/clientApi";

const ProtectedRoute = ({ token, children }) => {
  return token ? children : <Navigate to="/auth" replace />;
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Attempt silent background session restore on startup via httpOnly cookie in Redis
    authApi
      .refresh()
      .then((res) => {
        const freshToken = res.data?.data?.token;
        if (freshToken) {
          setClientAuthToken(freshToken);
          setToken(freshToken);
        }
      })
      .catch(() => {
        // No valid refresh cookie, reset state
        setClientAuthToken(null);
        setToken(null);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  const handleAuthSuccess = (authToken) => {
    setClientAuthToken(authToken);
    setToken(authToken);
  };

  const handleLogout = () => {
    setClientAuthToken(null);
    setToken(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={token ? "/home" : "/auth"} replace />}
        />
        <Route
          path="/auth"
          element={
            token ? (
              <Navigate to="/home" replace />
            ) : (
              <Auth onAuthSuccess={handleAuthSuccess} />
            )
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute token={token}>
              <Home token={token} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={token ? "/home" : "/auth"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
