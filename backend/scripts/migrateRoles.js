/**
 * One-time migration: imports the 4 roles from
 * ai-service/data/career_roles.json into the MongoDB `roles` collection.
 *
 * After this runs successfully, career_roles.json is no longer read by
 * any live code path - it only remains as the original seed data /
 * migration source, and as a record for the dissertation write-up of
 * what the initial dataset looked like.
 *
 * Run with: node scripts/migrateRoles.js
 * (from the backend/ directory, with .env configured)
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Role = require("../src/models/Role");

const CAREER_ROLES_PATH = path.join(
  __dirname,
  "..",
  "..",
  "ai-service",
  "data",
  "career_roles.json"
);

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");

  const existingCount = await Role.countDocuments();
  if (existingCount > 0) {
    console.log(
      `Roles collection already has ${existingCount} document(s) - aborting to avoid duplicates. ` +
        "Delete the existing roles first if you intend to re-run this migration."
    );
    await mongoose.disconnect();
    return;
  }

  const raw = fs.readFileSync(CAREER_ROLES_PATH, "utf-8");
  const { roles } = JSON.parse(raw);

  const documents = roles.map((role) => ({
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

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
