const express = require("express");
const axios = require("axios");

const router = express.Router();

// GET /api/roles
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
