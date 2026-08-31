const express = require("express");
const User = require("../models/User");
const { rescoreAndPersist } = require("../utils/rescoreAnalysis");

const router = express.Router();

// GET /api/user/me
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

// PATCH /api/user/profile
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

// GET /api/user/analysis
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

// DELETE /api/user/analysis ("Start fresh")
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

// PATCH /api/user/progress - toggles a skill and rescores against it
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
