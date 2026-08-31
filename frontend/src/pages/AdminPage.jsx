import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Modal from "../components/Modal";

// Inline icons instead of an icon library - only two are needed here
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.3 1.7a1.5 1.5 0 0 1 2.12 0l.88.88a1.5 1.5 0 0 1 0 2.12L5.5 13.4l-3.5.9.9-3.5 8.4-9.1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M9.5 3.5 12.5 6.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 4.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 4.5V2.7c0-.4.3-.7.7-.7h2.6c.4 0 .7.3.7.7v1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 4.5 4.6 13c0 .6.5 1 1 1h4.8c.5 0 1-.4 1-1l.6-8.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 7v4.5M9.5 7v4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// Textarea format: one "Skill: priority" pair per line
const VALID_PRIORITIES = ["high", "medium", "low"];

function parseSkills(text, fieldLabel) {
  const skills = [];
  const errors = [];

  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [rawSkill, rawPriority] = line.split(":").map((part) => part?.trim());
      const priority = rawPriority?.toLowerCase();

      if (!rawSkill || !priority || !VALID_PRIORITIES.includes(priority)) {
        errors.push(
          `${fieldLabel}: could not parse "${line}" - expected "Skill: priority" ` +
            `with priority one of high/medium/low.`
        );
        return;
      }

      skills.push({ skill: rawSkill, priority });
    });

  return { skills, errors };
}

function serializeSkills(skills) {
  return (skills || []).map((s) => `${s.skill}: ${s.priority}`).join("\n");
}

function parseResources(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, url] = line.split("|").map((part) => part.trim());
      return { title, url };
    });
}

function serializeResources(resources) {
  return (resources || []).map((r) => `${r.title}|${r.url}`).join("\n");
}

function parseProjects(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function serializeProjects(projects) {
  return (projects || []).join("\n");
}

const EMPTY_FORM = {
  role_name: "",
  description: "",
  technical_skills: "",
  soft_skills: "",
  learning_resources: "",
  portfolio_projects: "",
};

export default function AdminPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  async function loadRoles() {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/admin/roles", authHeaders);
      setRoles(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
        return;
      }
      setError(err.response?.data?.error || "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(role) {
    setEditingId(role._id);
    setForm({
      role_name: role.role_name,
      description: role.description || "",
      technical_skills: serializeSkills(role.technical_skills),
      soft_skills: serializeSkills(role.soft_skills),
      learning_resources: serializeResources(role.learning_resources),
      portfolio_projects: serializeProjects(role.portfolio_projects),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const technical = parseSkills(form.technical_skills, "Technical skills");
    const soft = parseSkills(form.soft_skills, "Soft skills");
    const parseErrors = [...technical.errors, ...soft.errors];

    if (parseErrors.length > 0) {
      setError(parseErrors.join(" "));
      return;
    }

    const payload = {
      role_name: form.role_name,
      description: form.description,
      technical_skills: technical.skills,
      soft_skills: soft.skills,
      learning_resources: parseResources(form.learning_resources),
      portfolio_projects: parseProjects(form.portfolio_projects),
    };

    try {
      if (editingId) {
        await apiClient.put(`/admin/roles/${editingId}`, payload, authHeaders);
      } else {
        await apiClient.post("/admin/roles", payload, authHeaders);
      }
      cancelEdit();
      await loadRoles();
    } catch (err) {
      setError(err.response?.data?.error || "Save failed. Please try again.");
    }
  }

  function handleDeleteClick(role) {
    setDeleteTarget(role);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setError("");
    setDeleting(true);
    try {
      await apiClient.delete(`/admin/roles/${deleteTarget._id}`, authHeaders);
      if (editingId === deleteTarget._id) cancelEdit();
      await loadRoles();
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.error || "Delete failed. Please try again.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar active="Admin" />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <div className="app-topbar-title">Career roles</div>
            <div className="app-topbar-subtitle">{roles.length} roles</div>
          </div>
        </header>

        <div className="app-content">
          {error && <p className="error-text">{error}</p>}

          <div className="admin-layout">
            <section className="data-table">
              <div className="data-table-head admin-table-row">
                <div>ROLE</div>
                <div>TECHNICAL</div>
                <div>SOFT</div>
                <div>RESOURCES</div>
                <div style={{ textAlign: "right" }}>ACTIONS</div>
              </div>
              {loading ? (
                <div style={{ padding: 20 }}>Loading...</div>
              ) : (
                roles.map((role) => (
                  <div className="data-table-row admin-table-row" key={role._id}>
                    <div style={{ fontWeight: 600 }}>{role.role_name}</div>
                    <div className="data-table-figure">{(role.technical_skills || []).length}</div>
                    <div className="data-table-figure">{(role.soft_skills || []).length}</div>
                    <div className="data-table-figure">{(role.learning_resources || []).length}</div>
                    <div className="admin-table-actions">
                      <button
                        className="admin-icon-btn"
                        onClick={() => startEdit(role)}
                        title={`Edit ${role.role_name}`}
                        aria-label={`Edit ${role.role_name}`}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="admin-icon-btn admin-icon-btn-delete"
                        onClick={() => handleDeleteClick(role)}
                        title={`Delete ${role.role_name}`}
                        aria-label={`Delete ${role.role_name}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>

            <div className="admin-edit-panel">
              <div className="admin-edit-head">
                <div>
                  <div className="mono-label">{editingId ? "EDITING ROLE" : "NEW ROLE"}</div>
                  <div className="admin-edit-title">{editingId ? form.role_name : "Add a role"}</div>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="admin-form">
                <label>
                  Role name
                  <input
                    value={form.role_name}
                    onChange={(e) => setForm({ ...form, role_name: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Description
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>

                <label>
                  Technical skills (one "Skill: priority" per line - priority is high/medium/low)
                  <textarea
                    value={form.technical_skills}
                    onChange={(e) => setForm({ ...form, technical_skills: e.target.value })}
                    rows={5}
                    placeholder={"Docker: high\nKubernetes: high\nLinux: medium"}
                  />
                </label>

                <label>
                  Soft skills (one "Skill: priority" per line)
                  <textarea
                    value={form.soft_skills}
                    onChange={(e) => setForm({ ...form, soft_skills: e.target.value })}
                    rows={3}
                    placeholder={"Problem Solving: high\nCommunication: medium"}
                  />
                </label>

                <label>
                  Learning resources (one "Title|URL" per line)
                  <textarea
                    value={form.learning_resources}
                    onChange={(e) => setForm({ ...form, learning_resources: e.target.value })}
                    rows={2}
                    placeholder="Docker Docs|https://docs.docker.com/"
                  />
                </label>

                <label>
                  Portfolio projects (one per line)
                  <textarea
                    value={form.portfolio_projects}
                    onChange={(e) => setForm({ ...form, portfolio_projects: e.target.value })}
                    rows={2}
                    placeholder="Set up a CI/CD pipeline for a sample app"
                  />
                </label>

                <div className="admin-form-actions">
                  <button type="submit" className="btn btn-primary">
                    {editingId ? "Save changes" : "Add role"}
                  </button>
                  {editingId && (
                    <button type="button" className="btn" onClick={cancelEdit}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete role?"
        message={
          deleteTarget &&
          `Delete ${deleteTarget.role_name}? This will permanently remove this role and its skills. This cannot be undone.`
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
