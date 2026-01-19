import { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin } from "./api.js"; // IMPORTANT: adjust path if api.js is in ./api/api.js etc.

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("fleet_admin_auth");
    const token = localStorage.getItem("token");

    if (stored && token) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.isAuthenticated) {
          setIsAuthenticated(true);
          setUser(parsed.user || null);
        }
      } catch {}
    }
  }, []);

  async function login(username, password) {
    try {
      const data = await apiLogin(username, password);

      const token = data.token;
      if (!token) {
        return { success: false, message: "Login response missing token" };
      }

      const userObj = { username: data.username, role: data.role };

      localStorage.setItem("token", token);

      const authState = {
        isAuthenticated: true,
        user: userObj,
      };

      setIsAuthenticated(true);
      setUser(userObj);
      localStorage.setItem("fleet_admin_auth", JSON.stringify(authState));

      return { success: true };
    } catch (err) {
      return { success: false, message: err?.message || "Login failed" };
    }
  }

  function logout() {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("fleet_admin_auth");
    localStorage.removeItem("token");
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
