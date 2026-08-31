import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Redirects an already-authenticated user away from /login and /register
export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
