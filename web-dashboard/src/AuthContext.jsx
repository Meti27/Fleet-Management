import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // e.g. { username: "admin" }

  useEffect(() => {
    const stored = localStorage.getItem("fleet_admin_auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.isAuthenticated) {
          setIsAuthenticated(true);
          setUser(parsed.user || null);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  function login(username, password) {
    // 🔐 DEMO CREDENTIALS - change if you want
    const DEMO_USER = "Anrra";
    const DEMO_PASS = "Anrra@123";

    if (username === DEMO_USER && password === DEMO_PASS) {
      const authState = {
        isAuthenticated: true,
        user: { username },
      };
      setIsAuthenticated(true);
      setUser(authState.user);
      localStorage.setItem("fleet_admin_auth", JSON.stringify(authState));
      return { success: true };
    }

    return { success: false, message: "Invalid username or password" };
  }

  function logout() {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("fleet_admin_auth");
  }

  const value = { isAuthenticated, user, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
