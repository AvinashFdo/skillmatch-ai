const axios = require("axios");
const User = require("../models/User");

/**
 * Re-scores an analysis against an updated skill list and persists the
 * result - the one shared mechanism behind BOTH ways a skill can get
 * folded into a user's matched-skills set after their initial analysis:
 * a manually-logged correction (cv.js's /correction route) and marking a
 * roadmap skill complete (user.js's /progress route). Both routes call
 * this same function rather than each re-implementing the "call AI
 * service -> merge -> persist" sequence, so there is exactly one place
 * that knows how a lastAnalysis gets rescored.
 *
 * Only extracted_skills/role_fit/recommended_role are replaced - every
 * other field on lastAnalysis (word_count, fileName, page_count, etc.)
 * describes the ORIGINAL analysis source and is left untouched, since a
 * later correction/completion doesn't change what CV was actually
 * uploaded or how long it was.
 *
 * @param {object} user - a fetched Mongoose User document (used for its
 *   _id and current lastAnalysis - callers must have already awaited
 *   User.findById before calling this).
 * @param {string[]} skills - the FULL updated extracted_skills list
 *   (already includes/excludes whatever changed - this function doesn't
 *   add or remove anything itself, callers decide the list). May be
 *   empty (e.g. reversing the last remaining completed/corrected skill)
 *   - the AI service's /rescore accepts that and scores everything as
 *   0% matched, same as a candidate with no extracted skills at all.
 * @returns {Promise<object>} the updated, already-persisted lastAnalysis.
 */
async function rescoreAndPersist(user, skills) {
  const rescoreResponse = await axios.post(`${process.env.AI_SERVICE_URL}/rescore`, { skills });

  const updatedAnalysis = {
    ...user.lastAnalysis,
    extracted_skills: rescoreResponse.data.extracted_skills,
    role_fit: rescoreResponse.data.role_fit,
    recommended_role: rescoreResponse.data.recommended_role,
  };

  await User.findByIdAndUpdate(user._id, { lastAnalysis: updatedAnalysis });
  return updatedAnalysis;
}

module.exports = { rescoreAndPersist };
