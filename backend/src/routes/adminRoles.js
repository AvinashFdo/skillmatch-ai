const express = require("express");
const Role = require("../models/Role");

const router = express.Router();

// GET /api/admin/roles
router.get("/", async (req, res, next) => {
  try {
    const roles = await Role.find().sort({ role_name: 1 });
    res.json(roles);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/roles
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

// PUT /api/admin/roles/:id
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

// DELETE /api/admin/roles/:id
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
