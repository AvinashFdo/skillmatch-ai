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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
