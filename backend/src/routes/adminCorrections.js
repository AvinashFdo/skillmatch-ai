const express = require("express");
const CorrectionLog = require("../models/CorrectionLog");

const router = express.Router();

// Same minimal protection as adminRoles.js - requireAuth only, no real
// admin-role check yet. See the limitation note there.

/**
 * GET /api/admin/corrections
 * Lists all logged manual skill corrections, newest first - useful for
 * spotting which skills get manually added most often (i.e. recurring
 * extraction failures), for the dissertation's evaluation discussion.
 */
router.get("/", async (req, res, next) => {
  try {
    const corrections = await CorrectionLog.find().sort({ timestamp: -1 });
    res.json(corrections);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
