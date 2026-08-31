const axios = require("axios");
const User = require("../models/User");

// Shared by /cv/correction and /user/progress to rescore + persist lastAnalysis
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
