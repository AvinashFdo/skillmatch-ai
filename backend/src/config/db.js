const mongoose = require("mongoose");

/**
 * Connects to MongoDB using MONGODB_URI from the environment.
 * Works identically whether that URI points at Atlas or a local instance.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

module.exports = connectDB;
