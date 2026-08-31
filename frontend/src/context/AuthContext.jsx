import { createContext, useContext, useEffect, useState } from "react";
import apiClient from "../api/client";

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = "skillmatch_token";
const USER_STORAGE_KEY = "skillmatch_user";

// `role` is re-fetched from GET /user/me on every token change, never decoded from the JWT
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!token) {
      setRole(null);
      return;
    }

    let cancelled = false;
    apiClient
      .get("/user/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!cancelled) setRole(res.data.role || "student");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function register(name, email, password) {
    const res = await apiClient.post("/auth/register", { name, email, password });
    return res.data;
  }

  async function login(email, password) {
    const res = await apiClient.post("/auth/login", { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data.user));
  }

  function logout() {
    setToken(null);
    setUser(null);
    setRole(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  const value = { token, user, role, isAuthenticated: Boolean(token), register, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
