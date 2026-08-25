const jwt = require("jsonwebtoken");

/**
 * Protects a route by requiring a valid "Bearer <token>" Authorization
 * header. On success, attaches the decoded payload ({ userId }) to
 * req.user for downstream handlers.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = requireAuth;
