import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

// Deliberately simple text formats instead of nested add/remove-row
// forms, per the "minimal/fast, no polish" scope for this admin panel:
//   skills:      one "Skill: priority" pair per line
//   resources:   one "Title|URL" pair per line
//   projects:    one project description per line
//
// Skills used to be comma-joined on a single line ("Skill:priority,
// Skill:priority"), which silently produced corrupted data (skill names
// with embedded newlines, priority defaulting to "medium" with no
// warning) whenever an admin typed one skill per line instead - a
// textarea invites exactly that. One-pair-per-line matches how a
// textarea is naturally used, and any line that doesn't parse is now
// surfaced as an error instead of silently accepted.
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

  async function handleDelete(roleId) {
    setError("");
    try {
      await apiClient.delete(`/admin/roles/${roleId}`, authHeaders);
      if (editingId === roleId) cancelEdit();
      await loadRoles();
    } catch (err) {
      setError(err.response?.data?.error || "Delete failed. Please try again.");
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
                      <button onClick={() => startEdit(role)}>Edit</button>
                      <button onClick={() => handleDelete(role._id)}>Delete</button>
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
    </div>
  );
}
