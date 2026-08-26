import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps routes that should only be reachable when logged OUT (/login,
 * /register). Redirects to /dashboard if a valid token already exists.
 *
 * Without this, an authenticated user who hits the browser Back button
 * from /dashboard lands on a fully usable /login form instead of being
 * bounced straight back - confusing, and the kind of thing that reads
 * as a real auth bug even though the token itself was never at risk
 * (see CLAUDE_LOG.md for the diagnosis: ProtectedRoute already
 * re-validates correctly on every navigation, including back/forward -
 * this was the only actual gap).
 */
export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
