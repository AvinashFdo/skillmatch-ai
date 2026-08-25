require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/auth");
const cvRoutes = require("./src/routes/cv");
const rolesRoutes = require("./src/routes/roles");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

// CORS_ORIGINS=* is used only during short remote user-testing sessions
// (tunnel URLs are unpredictable ahead of time) - normal dev keeps an
// explicit allowlist. See CLAUDE_LOG.md for the tunnel testing steps.
const corsOptions = allowedOrigins.includes("*") ? { origin: true } : { origin: allowedOrigins };
app.use(cors(corsOptions));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/cv", cvRoutes);
app.use("/api/roles", rolesRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Central error handler - catches anything passed to next(err) by routes,
// plus uncaught synchronous errors in route handlers.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SkillMatch backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
