import { createContext, useContext, useEffect, useState } from "react";
import apiClient from "../api/client";

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = "skillmatch_token";
const USER_STORAGE_KEY = "skillmatch_user";

/**
 * Provides auth state (token + user + role) to the whole app, and
 * persists the token/user to localStorage so a page refresh doesn't log
 * the student out mid-demo. Kept deliberately simple - no refresh-token
 * flow, since a single short-lived JWT is enough for this project's
 * scope.
 *
 * `role` is fetched from GET /user/me (not stored in localStorage, and
 * not decoded from the JWT - the token only carries userId) whenever
 * `token` changes, so it's always the CURRENT role, not a stale one
 * from login time - matches how the backend's own admin-route guard
 * (requireAdmin) re-checks the role fresh on every request rather than
 * trusting anything baked into the token. This is purely a UI
 * convenience for deciding what to show/redirect (the Admin sidebar
 * link, the AdminRoute guard) - it is NOT the real security boundary.
 * The real one is requireAdmin on the backend; hiding a link or
 * redirecting client-side does nothing to stop a request sent directly
 * to an admin API route with a non-admin token, which is exactly why
 * requireAdmin exists independently of this.
 */
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
      .catch(() => {
        // Non-critical here - worst case the Admin link stays hidden/
        // guarded, and the real backend check still applies regardless.
      });

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
