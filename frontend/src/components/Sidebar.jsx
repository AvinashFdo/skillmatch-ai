import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * App shell sidebar, structurally lifted from design_reference.html's
 * FIG 12 (the only screen in the reference with real inline markup for
 * it - every other screen references it via a placeholder
 * <dc-import name="Sidebar"> tag). Nav items are limited to the pages
 * this app actually has (Dashboard, Admin) - the reference shows more
 * (CV & Profile, Role Matches, Skill Gaps, Roadmap, Projects,
 * Resources, Progress, Readiness Report) because it covers features
 * not built here; those are deliberately not reproduced as nav items,
 * since that would imply pages that don't exist.
 */
export default function Sidebar({ active }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.name || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-sidebar">
      <div className="app-sidebar-header">
        <div className="app-sidebar-wordmark">SkillMatch AI</div>
        <div className="app-sidebar-subtitle">CAREER READINESS PLATFORM</div>
      </div>

      <nav className="app-sidebar-nav">
        <div className="app-sidebar-section-label">WORKSPACE</div>
        <Link
          to="/dashboard"
          className={`app-sidebar-item ${active === "Dashboard" ? "app-sidebar-item-active" : ""}`}
        >
          <span className="app-sidebar-item-bar" />
          <span>Dashboard</span>
        </Link>
        <Link
          to="/admin"
          className={`app-sidebar-item ${active === "Admin" ? "app-sidebar-item-active" : ""}`}
        >
          <span className="app-sidebar-item-bar" />
          <span>Admin</span>
        </Link>
      </nav>

      <div className="app-sidebar-footer">
        <div className="app-sidebar-avatar">{initials}</div>
        <div className="app-sidebar-footer-text">
          <div className="app-sidebar-footer-name">{user?.name}</div>
          <div className="app-sidebar-footer-email">{user?.email}</div>
        </div>
      </div>

      <button
        className="app-sidebar-logout"
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        Log out
      </button>
    </div>
  );
}
