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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
