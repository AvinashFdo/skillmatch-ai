const crypto = require("crypto");
const express = require("express");
const axios = require("axios");
const requireAuth = require("../middleware/auth");
const CorrectionLog = require("../models/CorrectionLog");

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

/**
 * POST /api/cv/correction  (protected)
 * Logs a manually-added skill (one the extractor missed), per lecturer
 * feedback that these corrections should feed back into a log for
 * spotting recurring extraction failures. Purely additive to the
 * existing analyze pipeline - this route does not call the AI service
 * or re-score anything (see CLAUDE_LOG.md for that scoping decision).
 *
 * cv_text is optional and used only to derive a SHA-256 hash for
 * cvSnippetHash - the raw text itself is never persisted, never sent
 * anywhere beyond this one hashing step.
 */
router.post("/correction", requireAuth, async (req, res, next) => {
  const { skill, cv_text } = req.body;

  if (!skill || !skill.trim()) {
    return res.status(400).json({ error: "skill is required." });
  }

  try {
    const cvSnippetHash = cv_text
      ? crypto.createHash("sha256").update(cv_text).digest("hex")
      : undefined;

    const entry = await CorrectionLog.create({
      userId: req.user.userId,
      cvSnippetHash,
      skillAdded: skill.trim(),
    });

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
