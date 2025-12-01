const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
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
