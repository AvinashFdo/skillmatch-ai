import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Redirects to /login if there's no valid token in auth state.
 * Does not verify the token's expiry client-side - an expired token
 * will simply get a 401 from the backend on the next API call, which
 * pages should handle by redirecting to /login (see DashboardPage).
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
