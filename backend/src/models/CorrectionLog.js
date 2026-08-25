const mongoose = require("mongoose");

/**
 * Logs manual skill corrections (a user adding a skill the extractor
 * missed), per lecturer feedback that these should feed back into a
 * log for spotting recurring extraction failures. Deliberately flat
 * and minimal - one document per correction, no relations beyond an
 * optional userId.
 *
 * Ethics note: cvSnippetHash is a SHA-256 hash of the CV text that
 * produced the correction, never the raw text itself - this project's
 * ethics commitment is to data minimisation, and a hash is enough to
 * later notice "the same CV keeps getting the same skill missed"
 * without ever persisting anything resembling personal CV content.
 */
const correctionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
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
