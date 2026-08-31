const crypto = require("crypto");
const express = require("express");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
const requireAuth = require("../middleware/auth");
const CorrectionLog = require("../models/CorrectionLog");
const User = require("../models/User");
const { rescoreAndPersist } = require("../utils/rescoreAnalysis");

const router = express.Router();

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

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

// POST /api/cv/analyze (protected)
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
      return res.status(err.response.status).json(err.response.data);
    }

    next(err);
  }
});

// POST /api/cv/analyze-file (protected)
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

// POST /api/cv/correction (protected)
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
    const updatedAnalysis = await rescoreAndPersist(user, updatedSkills);
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
