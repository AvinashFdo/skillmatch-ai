const mongoose = require("mongoose");

/**
 * Minimal user schema for basic auth. Password is stored as a bcrypt
 * hash only - the plaintext password is never persisted.
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true, // bcrypt hash, not plaintext
  },
  // Skill names the user has marked as done, toward whichever role's
  // roadmap they were viewing at the time. Deliberately just a flat
  // list of strings, not tied to a specific role or a separate
  // collection - the frontend recalculates readiness against whatever
  // role is currently displayed by intersecting this list with that
  // role's missing skills.
  completedSkills: {
    type: [String],
    default: [],
  },
  // The full response from the AI service's /analyze or /analyze-file
  // (extracted_skills, role_fit, recommended_role/roadmap), saved on
  // every successful analysis so results survive navigating between the
  // separate Dashboard/Skills/Roles/Roadmap pages and a page refresh -
  // each of those pages fetches this via GET /api/user/analysis on
  // mount instead of relying on in-memory state passed between routes.
  // Mixed rather than a formal sub-schema since its shape is owned by
  // the AI service, not this app - keeping it untyped here avoids the
  // two services' schemas drifting out of sync.
  lastAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  // Optional student profile fields, set via PATCH /api/user/profile.
  // studyHoursPerWeek is the only one used functionally - it drives the
  // roadmap completion-time estimate on /roadmap. programme/year are
  // purely informational (shown on the Dashboard profile panel) - not
  // used in any scoring/analysis logic, deliberately, per scope.
  programme: {
    type: String,
    default: "",
    trim: true,
  },
  year: {
    type: String,
    default: "",
    trim: true,
  },
  studyHoursPerWeek: {
    type: Number,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
