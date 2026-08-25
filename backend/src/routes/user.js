const express = require("express");
const User = require("../models/User");

const router = express.Router();

/**
 * GET /api/user/me
 * Returns the logged-in user's profile, including their completed
 * skills list - used by the dashboard to restore checkbox state and
 * compute readiness on load.
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
      completedSkills: user.completedSkills,
    });
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
