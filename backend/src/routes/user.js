const express = require("express");
const User = require("../models/User");

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
 * adds it if not present, removes it if already there. Returns the
 * updated array so the frontend doesn't need a separate re-fetch.
 */
router.patch("/progress", async (req, res, next) => {
  const { skill } = req.body;

  if (!skill || !skill.trim()) {
    return res.status(400).json({ error: "skill is required." });
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const index = user.completedSkills.indexOf(skill);
    if (index === -1) {
      user.completedSkills.push(skill);
    } else {
      user.completedSkills.splice(index, 1);
    }

    await user.save();
    res.json({ completedSkills: user.completedSkills });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
