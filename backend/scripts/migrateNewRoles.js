/**
 * One-time migration: adds the 7 remaining roles from the original
 * proposal's full 11-role list (ai-service/data/new_roles_to_add.json)
 * to the existing MongoDB `roles` collection, alongside the 4 roles
 * migrateRoles.js already inserted (Frontend Developer, Backend
 * Developer, Data Analyst, QA Engineer).
 *
 * Unlike migrateRoles.js (which aborts if the collection has ANY
 * documents, since its job was a one-shot full seed), this script's
 * duplicate guard is per-role: it skips inserting a role if a document
 * with that exact role_name already exists, and inserts only the ones
 * that don't. This is what lets it run safely alongside the existing 4
 * roles without touching or duplicating them, and also makes it safe to
 * re-run (e.g. if it's interrupted partway through inserting the 7).
 *
 * Run with: node scripts/migrateNewRoles.js
 * (from the backend/ directory, with .env configured)
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Role = require("../src/models/Role");

const NEW_ROLES_PATH = path.join(
  __dirname,
  "..",
  "..",
  "ai-service",
  "data",
  "new_roles_to_add.json"
);

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");

  const raw = fs.readFileSync(NEW_ROLES_PATH, "utf-8");
  const { new_roles: newRoles } = JSON.parse(raw);

  const existingNames = new Set((await Role.find({}, "role_name")).map((r) => r.role_name));

  const toInsert = newRoles.filter((role) => !existingNames.has(role.role_name));
  const skipped = newRoles.filter((role) => existingNames.has(role.role_name));

  if (skipped.length > 0) {
    console.log(`Skipping ${skipped.length} role(s) already present (by role_name):`);
    skipped.forEach((r) => console.log(`  - ${r.role_name}`));
  }

  if (toInsert.length === 0) {
    console.log("Nothing to insert - all roles from new_roles_to_add.json already exist.");
    await mongoose.disconnect();
    return;
  }

  const documents = toInsert.map((role) => ({
    role_name: role.role_name,
    description: role.description,
    technical_skills: role.technical_skills,
    soft_skills: role.soft_skills,
    learning_resources: role.learning_resources,
    portfolio_projects: role.portfolio_projects,
  }));

  const inserted = await Role.insertMany(documents);
  console.log(`Inserted ${inserted.length} roles:`);
  inserted.forEach((r) => console.log(`  - ${r._id}  ${r.role_name}`));

  const totalCount = await Role.countDocuments();
  console.log(`Total roles in collection now: ${totalCount}`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
