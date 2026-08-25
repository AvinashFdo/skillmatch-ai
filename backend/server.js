require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/auth");
const cvRoutes = require("./src/routes/cv");
const rolesRoutes = require("./src/routes/roles");
const adminRolesRoutes = require("./src/routes/adminRoles");
const adminCorrectionsRoutes = require("./src/routes/adminCorrections");
const userRoutes = require("./src/routes/user");
const requireAuth = require("./src/middleware/auth");

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
// Protected by requireAuth only (any logged-in user), not a real admin
// role check - see the limitation note in src/routes/adminRoles.js.
app.use("/api/admin/roles", requireAuth, adminRolesRoutes);
app.use("/api/admin/corrections", requireAuth, adminCorrectionsRoutes);
app.use("/api/user", requireAuth, userRoutes);

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
// Bind explicitly to 0.0.0.0 rather than relying on Node's default -
// Railway/Render route external traffic to the container's exposed
// port on all interfaces, and their proxy cannot reach a process bound
// only to the loopback interface (127.0.0.1/"localhost").
const HOST = "0.0.0.0";

connectDB()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`SkillMatch backend listening on ${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
