const mongoose = require("mongoose");

const DEFAULT_LOCAL_URI = "mongodb://127.0.0.1:27017/login-demo";
const MONGODB_URI = process.env.MONGODB_URI ?? DEFAULT_LOCAL_URI;

if (!process.env.MONGODB_URI) {
  console.warn(
    `MONGODB_URI is not set. Falling back to local MongoDB at ${DEFAULT_LOCAL_URI}. ` +
      "Set MONGODB_URI to your database connection string to silence this warning."
  );
}

const cached = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((m) => m)
      .catch((error) => {
        // Allow retries if the initial connection fails instead of caching the rejection.
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    // Clear the cached promise so future requests can attempt to reconnect.
    cached.promise = null;
    throw error;
  }
}

module.exports = dbConnect;
