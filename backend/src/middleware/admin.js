const User = require("../models/User");

// Re-checks the user's role fresh from the database on every request
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAdmin;
