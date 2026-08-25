const mongoose = require("mongoose");

// A "high"/"medium"/"low" enum here isn't just data validation - the AI
// service's scoring engine (ai-service/scripts/role_fit_scorer.py) uses
// this exact string as a dict key (PRIORITY_WEIGHTS[priority]). Any
// other value would throw a KeyError and break scoring for every role,
// not just this one, so this is enforced at the schema level rather
// than left to the admin form.
const skillSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true, trim: true },
    priority: { type: String, required: true, enum: ["high", "medium", "low"] },
  },
  { _id: false }
);

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false }
);

/**
 * Mirrors career_roles.json's per-role structure. Mongo's own `_id`
 * replaces the JSON file's string `role_id` field throughout the app -
 * there was no reason to keep a second identifier once role data moved
 * into a database that already provides one.
 */
const roleSchema = new mongoose.Schema({
  role_name: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  technical_skills: { type: [skillSchema], default: [] },
  soft_skills: { type: [skillSchema], default: [] },
  learning_resources: { type: [resourceSchema], default: [] },
  portfolio_projects: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Role", roleSchema);
