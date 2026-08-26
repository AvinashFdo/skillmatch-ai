const crypto = require("crypto");
const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const requireAuth = require("../middleware/auth");
const CorrectionLog = require("../models/CorrectionLog");
const User = require("../models/User");

const router = express.Router();

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

// Holds the uploaded file in memory only (never written to disk) -
// fine at this size cap, and simplest to immediately forward to the
// AI service without a temp-file cleanup step.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    const lowerName = file.originalname.toLowerCase();
    const isAllowed = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!isAllowed) {
      return cb(new Error("Unsupported file type. Please upload a .pdf or .docx file."));
    }
    cb(null, true);
  },
});

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
    await User.findByIdAndUpdate(req.user.userId, { lastAnalysis: aiResponse.data });
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
 * POST /api/cv/analyze-file  (protected)
 * Accepts a multipart file upload (.pdf/.docx, capped at 5MB), forwards
 * it to the AI service's /analyze-file endpoint, and returns the same
 * combined result shape as /analyze. Additive alongside the existing
 * text-paste flow - that route is untouched.
 */
router.post("/analyze-file", requireAuth, (req, res, next) => {
  upload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File is too large. Maximum size is 5MB." });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "A file is required." });
    }

    try {
      const formData = new FormData();
      formData.append("file", req.file.buffer, { filename: req.file.originalname });

      const aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL}/analyze-file`,
        formData,
        { headers: formData.getHeaders() }
      );
      await User.findByIdAndUpdate(req.user.userId, { lastAnalysis: aiResponse.data });
      res.json(aiResponse.data);
    } catch (aiErr) {
      if (aiErr.code === "ECONNREFUSED") {
        return res.status(503).json({
          error: "AI service is unreachable. Is it running at " + process.env.AI_SERVICE_URL + "?",
        });
      }

      if (aiErr.response) {
        return res.status(aiErr.response.status).json(aiErr.response.data);
      }

      next(aiErr);
    }
  });
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
