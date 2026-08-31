const mongoose = require("mongoose");

const correctionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  // SHA-256 hash of the source CV text, never the raw text itself
  cvSnippetHash: {
    type: String,
    required: false,
  },
  skillAdded: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("CorrectionLog", correctionLogSchema);
