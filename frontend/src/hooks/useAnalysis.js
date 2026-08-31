import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";

// Shared data layer for the Dashboard/Skills/Roles/Roadmap pages
export default function useAnalysis() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [completedSkills, setCompletedSkills] = useState([]);
  const [initialCompletedSkills, setInitialCompletedSkills] = useState([]);
  const [profile, setProfile] = useState({ programme: "", year: "", studyHoursPerWeek: null });
  const [loading, setLoading] = useState(true);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const handleAuthError = useCallback(
    (err) => {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
        return true;
      }
      return false;
    },
    [logout, navigate]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [analysisRes, meRes] = await Promise.all([
          apiClient.get("/user/analysis", { headers: { Authorization: `Bearer ${token}` } }).catch((err) => {
            if (err.response?.status === 404) return { data: null };
            throw err;
          }),
          apiClient.get("/user/me", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (cancelled) return;
        setResult(analysisRes.data);
        setCompletedSkills(meRes.data.completedSkills || []);
        setInitialCompletedSkills(meRes.data.completedSkills || []);
        setProfile({
          programme: meRes.data.programme || "",
          year: meRes.data.year || "",
          studyHoursPerWeek: meRes.data.studyHoursPerWeek ?? null,
        });
      } catch (err) {
        if (!cancelled) handleAuthError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, handleAuthError]);

  async function toggleSkill(skill) {
    // optimistic update, reverted below on failure
    setCompletedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );

    try {
      const res = await apiClient.patch("/user/progress", { skill }, authHeaders);
      setCompletedSkills(res.data.completedSkills);
      if (res.data.analysis) {
        setResult(res.data.analysis);
      }
    } catch (err) {
      setCompletedSkills((prev) =>
        prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
      );
      handleAuthError(err);
    }
  }

  async function updateProfile(updates) {
    const res = await apiClient.patch("/user/profile", updates, authHeaders);
    setProfile((prev) => ({ ...prev, ...res.data }));
  }

  async function resetAnalysis() {
    await apiClient.delete("/user/analysis", authHeaders);
    setResult(null);
    setCompletedSkills([]);
    setInitialCompletedSkills([]);
  }

  async function addCorrection(skill) {
    const res = await apiClient.post("/cv/correction", { skill }, authHeaders);
    if (res.data.analysis) {
      setResult(res.data.analysis);
    }
  }

  return {
    result,
    setResult,
    completedSkills,
    initialCompletedSkills,
    profile,
    updateProfile,
    loading,
    toggleSkill,
    resetAnalysis,
    addCorrection,
    handleAuthError,
  };
}
