const mongoose = require("mongoose");

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
  // no self-service way to become admin - promotion is a manual DB write
  role: {
    type: String,
    enum: ["student", "admin"],
    default: "student",
  },
  completedSkills: {
    type: [String],
    default: [],
  },
  // shape owned by the AI service - kept untyped to avoid schema drift
  lastAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
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
