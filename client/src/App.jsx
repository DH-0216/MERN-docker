import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Auth from "./pages/Auth";
import Home from "./pages/Home";

const ProtectedRoute = ({ token, children }) => {
  return token ? children : <Navigate to="/auth" replace />;
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));

  const handleAuthSuccess = (authToken) => {
    localStorage.setItem("authToken", authToken);
    setToken(authToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
  };

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
