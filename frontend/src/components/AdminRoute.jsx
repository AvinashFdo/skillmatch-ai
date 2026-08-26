import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps /admin. Requires both an authenticated session (same check as
 * ProtectedRoute) AND role === "admin" (fetched fresh from GET /user/me
 * by AuthContext - see its docstring). Redirects non-admins to
 * /dashboard rather than /login, since they ARE logged in - "no
 * permission" is a different case from "not authenticated".
 *
 * This is a UI convenience only, same as hiding the Admin sidebar link -
 * it stops a non-admin from landing on a broken/empty admin page in the
 * app's own UI, nothing more. It provides no actual security: a non-
 * admin could still hit the admin API routes directly (curl, Postman,
 * a modified fetch call) - what stops THAT is requireAdmin on the
 * backend (backend/src/middleware/admin.js), which re-checks the role
 * server-side on every request regardless of what this component does.
 * Client-side route guards are for UX, not access control.
 *
 * While `role` hasn't resolved yet (null - the GET /user/me fetch in
 * AuthContext is still in flight, e.g. right after a page refresh),
 * this renders nothing rather than redirecting immediately - avoids
 * incorrectly bouncing an actual admin away before their role is known.
 */
export default function AdminRoute({ children }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === null) {
    return null;
  }

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
