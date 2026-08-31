import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// UI convenience only - the real enforcement is requireAdmin on the backend
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
