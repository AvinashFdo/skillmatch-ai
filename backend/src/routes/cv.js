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
      // The AI service only ever sees the file's bytes and the name we
      // pass it above - it has no idea what the original upload's size
      // was (multer already knows both from req.file), so the original
      // filename/size are merged in here rather than round-tripped
      // through the AI service for no reason.
      const responseData = {
        ...aiResponse.data,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      };
      await User.findByIdAndUpdate(req.user.userId, { lastAnalysis: responseData });
      res.json(responseData);
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
 * spotting recurring extraction failures.
 *
 * Also folds the skill into the user's persisted lastAnalysis (if one
 * exists) so it actually counts wherever a role requires it - Role
 * Matches, Roadmap, and Dashboard's stat cards all read from
 * lastAnalysis, so a correction that only lived in frontend component
 * state (the original implementation) never showed up there and was
 * lost on refresh. Re-scoring reuses the AI service's existing
 * role_fit_scorer/roadmap_generator logic via POST /rescore - no
 * duplicated scoring logic here, this route just merges the result back
 * into lastAnalysis and re-saves it, the same way /analyze and
 * /analyze-file already do.
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
  const trimmedSkill = skill.trim();

  try {
    const cvSnippetHash = cv_text
      ? crypto.createHash("sha256").update(cv_text).digest("hex")
      : undefined;

    await CorrectionLog.create({
      userId: req.user.userId,
      cvSnippetHash,
      skillAdded: trimmedSkill,
    });

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // No existing analysis to fold this into - the correction is still
    // logged above (for the recurring-failure log), there's just
    // nothing to rescore/persist yet.
    if (!user.lastAnalysis) {
      return res.status(200).json({ logged: true, analysis: null });
    }

    const currentSkills = user.lastAnalysis.extracted_skills || [];
    const alreadyPresent = currentSkills.some(
      (s) => s.toLowerCase() === trimmedSkill.toLowerCase()
    );

    if (alreadyPresent) {
      return res.status(200).json({ logged: true, analysis: user.lastAnalysis });
    }

    const updatedSkills = [...currentSkills, trimmedSkill];
    const rescoreResponse = await axios.post(`${process.env.AI_SERVICE_URL}/rescore`, {
      skills: updatedSkills,
    });

    const updatedAnalysis = {
      ...user.lastAnalysis,
      extracted_skills: rescoreResponse.data.extracted_skills,
      role_fit: rescoreResponse.data.role_fit,
      recommended_role: rescoreResponse.data.recommended_role,
    };

    await User.findByIdAndUpdate(req.user.userId, { lastAnalysis: updatedAnalysis });
    res.json({ logged: true, analysis: updatedAnalysis });
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
