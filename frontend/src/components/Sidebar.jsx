import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * App shell sidebar, structurally lifted from design_reference.html's
 * FIG 12. Nav items now cover Dashboard, Skills, Roles, Roadmap and
 * Admin - the reference's page breakdown (CV & Profile / Role Matches /
 * Skill Gaps / Roadmap / ...) is now matched by the app's own routing,
 * after the single all-in-one Dashboard was split into 4 pages. A few
 * of the reference's other nav items (Projects, Resources, Progress as
 * a separate page) still aren't reproduced, since those remain folded
 * into Roadmap/Skills here rather than being separate routes.
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
          to="/skills"
          className={`app-sidebar-item ${active === "Skills" ? "app-sidebar-item-active" : ""}`}
        >
          <span className="app-sidebar-item-bar" />
          <span>Skills</span>
        </Link>
        <Link
          to="/roles"
          className={`app-sidebar-item ${active === "Roles" ? "app-sidebar-item-active" : ""}`}
        >
          <span className="app-sidebar-item-bar" />
          <span>Role Matches</span>
        </Link>
        <Link
          to="/roadmap"
          className={`app-sidebar-item ${active === "Roadmap" ? "app-sidebar-item-active" : ""}`}
        >
          <span className="app-sidebar-item-bar" />
          <span>Roadmap</span>
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
