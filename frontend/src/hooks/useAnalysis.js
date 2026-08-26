import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";

/**
 * Shared data layer for the four analysis pages (Dashboard/Skills/Roles/
 * Roadmap). Each page mounts independently via its own route, so results
 * can no longer be passed in-memory between them - this hook fetches the
 * logged-in user's persisted lastAnalysis (GET /api/user/analysis) and
 * completedSkills (GET /api/user/me) on every mount, which is what makes
 * a direct visit or a refresh of any single page correctly restore data
 * instead of showing blank/broken state.
 *
 * A 404 from /user/analysis just means "no analysis yet" - treated as a
 * normal, expected result (null), not an error.
 *
 * Also fetches the user's optional profile fields (programme, year,
 * studyHoursPerWeek) from the same /user/me call rather than a separate
 * request - Dashboard's profile panel and Roadmap's time estimate both
 * need it, and /user/me already returns it now.
 */
export default function useAnalysis() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [completedSkills, setCompletedSkills] = useState([]);
  // A frozen snapshot of completedSkills as it was the moment this page's
  // data finished loading - never updated by toggleSkill afterward. Lets
  // the UI tell "was already complete before this page loaded" (e.g.
  // carried over from a previous analysis under a different top role -
  // see the completedSkills investigation in CLAUDE_LOG.md) apart from
  // "checked just now in this session", without needing any new API call
  // or touching the completedSkills data model itself.
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
    // Optimistic update so the checkbox feels instant; the PATCH
    // response is the source of truth and overwrites this if different.
    setCompletedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );

    try {
      const res = await apiClient.patch("/user/progress", { skill }, authHeaders);
      setCompletedSkills(res.data.completedSkills);
    } catch (err) {
      // Revert the optimistic update on failure.
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

  async function addCorrection(skill) {
    // cv_text is intentionally omitted here - the raw pasted text only
    // ever lived in Dashboard's local component state and was never
    // persisted server-side (by design - see cv.js), so it isn't
    // available from other pages after navigating away from Dashboard.
    // The correction is still logged correctly; only its optional
    // cvSnippetHash ends up unset in that case.
    await apiClient.post("/cv/correction", { skill }, authHeaders);
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
    addCorrection,
    handleAuthError,
  };
}
