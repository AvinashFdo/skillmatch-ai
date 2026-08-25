const express = require("express");
const Role = require("../models/Role");

const router = express.Router();

// LIMITATION: there is no role-based permission system yet - any
// logged-in user can reach these routes (the requireAuth middleware
// that protects this whole router, mounted in server.js, only checks
// for a valid JWT, not an "admin" flag on the user). Fine for this
// project's scope, but a real admin panel would need a proper
// role/permission check here before these routes go further.

/**
 * GET /api/admin/roles
 * Lists all roles, used by the admin panel's table view.
 */
router.get("/", async (req, res, next) => {
  try {
    const roles = await Role.find().sort({ role_name: 1 });
    res.json(roles);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/roles
 * Creates a new role. Mongoose schema validation (see Role.js) rejects
 * any skill priority outside high/medium/low, since an invalid value
 * would otherwise break the AI service's scoring for every role.
 */
router.post("/", async (req, res, next) => {
  try {
    const role = await Role.create(req.body);
    res.status(201).json(role);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * PUT /api/admin/roles/:id
 * Updates an existing role by its Mongo _id.
 */
router.put("/:id", async (req, res, next) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!role) {
      return res.status(404).json({ error: "Role not found." });
    }

    res.json(role);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * DELETE /api/admin/roles/:id
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);

    if (!role) {
      return res.status(404).json({ error: "Role not found." });
    }

    res.json({ message: "Role deleted successfully." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
