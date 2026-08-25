import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";

// Deliberately simple text formats instead of nested add/remove-row
// forms, per the "minimal/fast, no polish" scope for this admin panel:
//   skills:      "Skill:priority, Skill:priority"        e.g. "Docker:high, Linux:medium"
//   resources:   one "Title|URL" pair per line
//   projects:    one project description per line
function parseSkills(text) {
  return text
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [skill, priority] = entry.split(":").map((part) => part.trim());
      return { skill, priority: (priority || "medium").toLowerCase() };
    });
}

function serializeSkills(skills) {
  return (skills || []).map((s) => `${s.skill}:${s.priority}`).join(", ");
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

    const payload = {
      role_name: form.role_name,
      description: form.description,
      technical_skills: parseSkills(form.technical_skills),
      soft_skills: parseSkills(form.soft_skills),
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
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Admin - Manage Roles</h1>
        <Link to="/dashboard">Back to Dashboard</Link>
      </header>

      {error && <p className="error-text">{error}</p>}

      <section className="upload-section">
        <h2>{editingId ? "Edit Role" : "Add New Role"}</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <label>
            Role Name
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
            Technical Skills ("Skill:priority, Skill:priority" - priority is high/medium/low)
            <textarea
              value={form.technical_skills}
              onChange={(e) => setForm({ ...form, technical_skills: e.target.value })}
              rows={3}
              placeholder="Docker:high, Kubernetes:high, Linux:medium"
            />
          </label>

          <label>
            Soft Skills ("Skill:priority, Skill:priority")
            <textarea
              value={form.soft_skills}
              onChange={(e) => setForm({ ...form, soft_skills: e.target.value })}
              rows={2}
              placeholder="Problem Solving:high, Communication:medium"
            />
          </label>

          <label>
            Learning Resources (one "Title|URL" per line)
            <textarea
              value={form.learning_resources}
              onChange={(e) => setForm({ ...form, learning_resources: e.target.value })}
              rows={2}
              placeholder="Docker Docs|https://docs.docker.com/"
            />
          </label>

          <label>
            Portfolio Projects (one per line)
            <textarea
              value={form.portfolio_projects}
              onChange={(e) => setForm({ ...form, portfolio_projects: e.target.value })}
              rows={2}
              placeholder="Set up a CI/CD pipeline for a sample app"
            />
          </label>

          <div>
            <button type="submit">{editingId ? "Save Changes" : "Add Role"}</button>
            {editingId && (
              <button type="button" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="upload-section">
        <h2>Existing Roles ({roles.length})</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Technical Skills</th>
                <th>Soft Skills</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role._id}>
                  <td>{role.role_name}</td>
                  <td>{(role.technical_skills || []).length}</td>
                  <td>{(role.soft_skills || []).length}</td>
                  <td>
                    <button onClick={() => startEdit(role)}>Edit</button>
                    <button onClick={() => handleDelete(role._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
