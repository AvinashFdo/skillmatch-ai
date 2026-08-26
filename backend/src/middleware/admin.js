const User = require("../models/User");

/**
 * Must run after requireAuth (needs req.user.userId already set from the
 * verified JWT). Looks up the user's role fresh from the database on
 * every request, rather than trusting a role baked into the JWT at
 * login time - this is what lets an admin promotion (or demotion) take
 * effect immediately, without the affected user needing to log out and
 * back in. The extra query is negligible here since admin routes aren't
 * a hot path.
 */
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
