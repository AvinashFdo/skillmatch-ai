const express = require("express");
const axios = require("axios");
const requireAuth = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/cv/analyze  (protected)
 * Forwards CV text to the Python AI service's /analyze endpoint and
 * returns its response unchanged. The frontend never talks to the AI
 * service directly - this route is the only path to it.
 */
router.post("/analyze", requireAuth, async (req, res, next) => {
  const { cv_text } = req.body;

  if (!cv_text || !cv_text.trim()) {
    return res.status(400).json({ error: "cv_text is required." });
  }

  try {
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/analyze`, {
      cv_text,
    });
    res.json(aiResponse.data);
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({
        error: "AI service is unreachable. Is it running at " + process.env.AI_SERVICE_URL + "?",
      });
    }

    if (err.response) {
      // AI service responded with an error (e.g. 400/500) - pass its
      // status and message through rather than masking it as a 500.
      return res.status(err.response.status).json(err.response.data);
    }

    next(err);
  }
});

module.exports = router;
