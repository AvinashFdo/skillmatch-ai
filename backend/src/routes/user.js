const express = require("express");
const User = require("../models/User");
const { rescoreAndPersist } = require("../utils/rescoreAnalysis");

const router = express.Router();

/**
 * GET /api/user/me
 * Returns the logged-in user's profile, including their completed
 * skills list - used by the dashboard to restore checkbox state and
 * compute readiness on load. Also returns `role`, which the frontend
 * uses to decide whether to show the Admin sidebar link/route - purely
 * a UI convenience, not a security boundary (the real one is
 * requireAdmin on the backend admin routes).
 */
router.get("/me", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      completedSkills: user.completedSkills,
      programme: user.programme,
      year: user.year,
      studyHoursPerWeek: user.studyHoursPerWeek,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/user/profile
 * Updates the logged-in user's optional profile fields (programme,
 * year, studyHoursPerWeek). All three are optional and independently
 * settable - a request only needs to include the fields it wants to
 * change. studyHoursPerWeek must be a positive number when provided
 * (used as a divisor for the roadmap time estimate - zero/negative
 * would produce a nonsensical or infinite estimate).
 */
router.patch("/profile", async (req, res, next) => {
  const { programme, year, studyHoursPerWeek } = req.body;

  if (
    studyHoursPerWeek !== undefined &&
    studyHoursPerWeek !== null &&
    (typeof studyHoursPerWeek !== "number" || !Number.isFinite(studyHoursPerWeek) || studyHoursPerWeek <= 0)
  ) {
    return res.status(400).json({ error: "studyHoursPerWeek must be a positive number." });
  }

  try {
    const update = {};
    if (programme !== undefined) update.programme = programme;
    if (year !== undefined) update.year = year;
    if (studyHoursPerWeek !== undefined) update.studyHoursPerWeek = studyHoursPerWeek;

    const user = await User.findByIdAndUpdate(req.user.userId, update, { new: true });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      programme: user.programme,
      year: user.year,
      studyHoursPerWeek: user.studyHoursPerWeek,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/user/analysis
 * Returns the logged-in user's most recently saved analysis result (the
 * same shape /cv/analyze and /cv/analyze-file return) - lets the
 * Dashboard/Skills/Roles/Roadmap pages restore results on mount or
 * refresh instead of relying on in-memory state passed between routes.
 * 404s if the user hasn't analyzed a CV yet.
 */
router.get("/analysis", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    if (!user.lastAnalysis) {
      return res.status(404).json({ error: "No analysis found yet." });
    }

    res.json(user.lastAnalysis);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/user/analysis
 * "Start fresh" - clears the logged-in user's lastAnalysis (back to
 * null) and completedSkills (back to an empty array), so the next visit
 * to any of the Dashboard/Skills/Roles/Roadmap/Report pages correctly
 * shows their "no analysis yet" empty state instead of stale results
 * from a CV the student wants to move on from.
 *
 * Deliberately does NOT touch programme/year/studyHoursPerWeek - those
 * describe the student, not a specific CV/analysis, so there's no
 * reason to lose them just because the student wants to re-analyze.
 */
router.delete("/analysis", async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { lastAnalysis: null, completedSkills: [] },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ message: "Analysis and progress cleared." });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/user/progress
 * Toggles a single skill name in the user's completedSkills array -
 * adds it if not present, removes it if already there.
 *
 * Also folds the skill into (or out of) the user's persisted
 * lastAnalysis and re-scores, via the exact same rescoreAndPersist()
 * helper the /cv/correction route uses - completing a roadmap skill is
 * treated as "the user has now demonstrated this skill", so it counts
 * as matched for Role Matches/Skills/Dashboard the same way a manual
 * correction does. Reversible, unlike a correction: unchecking removes
 * the skill again and re-scores back to the prior state.
 *
 * This is provably safe to do unconditionally (no "was this really
 * added by completion?" tracking needed): a skill can only be checked
 * complete from the roadmap page while it's still MISSING for the
 * user's top role - i.e. NOT already in extracted_skills - so the only
 * way it can be present in extracted_skills afterward is because this
 * exact toggle-on step put it there. Toggling off can therefore always
 * safely remove it.
 */
router.patch("/progress", async (req, res, next) => {
  const { skill } = req.body;

  if (!skill || !skill.trim()) {
    return res.status(400).json({ error: "skill is required." });
  }
  const trimmedSkill = skill.trim();

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const index = user.completedSkills.indexOf(trimmedSkill);
    const isCompleting = index === -1;
    if (isCompleting) {
      user.completedSkills.push(trimmedSkill);
    } else {
      user.completedSkills.splice(index, 1);
    }
    await user.save();

    let updatedAnalysis = user.lastAnalysis;
    if (user.lastAnalysis) {
      const currentSkills = user.lastAnalysis.extracted_skills || [];
      const alreadyPresent = currentSkills.some(
        (s) => s.toLowerCase() === trimmedSkill.toLowerCase()
      );

      if (isCompleting && !alreadyPresent) {
        updatedAnalysis = await rescoreAndPersist(user, [...currentSkills, trimmedSkill]);
      } else if (!isCompleting && alreadyPresent) {
        const withoutSkill = currentSkills.filter(
          (s) => s.toLowerCase() !== trimmedSkill.toLowerCase()
        );
        updatedAnalysis = await rescoreAndPersist(user, withoutSkill);
      }
    }

    res.json({ completedSkills: user.completedSkills, analysis: updatedAnalysis });
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({
        error: "AI service is unreachable. Is it running at " + process.env.AI_SERVICE_URL + "?",
      });
    }
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    next(err);
  }
});

module.exports = router;
