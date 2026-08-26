/**
 * One-time utility: promotes one user to role "admin" by email.
 *
 * There is deliberately no self-service way to become admin (no signup
 * field, no API route for it) - this is a small, fixed-roster student
 * project, not a multi-tenant app that needs an admin-invites-admin
 * flow, so a manual DB-level promotion script is the right amount of
 * mechanism.
 *
 * Run with: node scripts/promoteAdmin.js <email>
 * (from the backend/ directory, with .env configured)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");

async function promote() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/promoteAdmin.js <email>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: "admin" },
    { new: true }
  );

  if (!user) {
    console.log(`No user found with email ${email} - nothing changed.`);
  } else {
    console.log(`Promoted ${user.email} (${user._id}) to role "${user.role}".`);
  }

  await mongoose.disconnect();
}

promote().catch((err) => {
  console.error("Promotion failed:", err);
  process.exit(1);
});
