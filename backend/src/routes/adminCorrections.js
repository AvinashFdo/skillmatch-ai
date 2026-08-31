const express = require("express");
const CorrectionLog = require("../models/CorrectionLog");

const router = express.Router();

// GET /api/admin/corrections
router.get("/", async (req, res, next) => {
  try {
    const corrections = await CorrectionLog.find().sort({ timestamp: -1 });
    res.json(corrections);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
