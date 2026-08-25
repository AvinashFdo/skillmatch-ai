const express = require("express");
const axios = require("axios");

const router = express.Router();

/**
 * GET /api/roles
 * Proxies to the Python AI service's GET /roles endpoint, returning the
 * full career_roles.json dataset. Left unauthenticated since role
 * information is not user-specific (e.g. useful for a "browse roles"
 * page before signup).
 */
router.get("/", async (req, res, next) => {
  try {
    const aiResponse = await axios.get(`${process.env.AI_SERVICE_URL}/roles`);
    res.json(aiResponse.data);
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({
        error: "AI service is unreachable. Is it running at " + process.env.AI_SERVICE_URL + "?",
      });
    }

    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }

    next(err);
  }
});

module.exports = router;
