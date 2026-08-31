const mongoose = require("mongoose");

// priority must match the AI service's PRIORITY_WEIGHTS keys exactly
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
