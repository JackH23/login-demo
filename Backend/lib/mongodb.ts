// MongoDB ODM for creating connections and models
import mongoose from 'mongoose';

// Connection string to the MongoDB instance
const MONGODB_URI = process.env.MONGODB_URI as string | undefined;

// Shape of the cached connection object stored on the Node.js global
interface MongooseCache {
  // Active mongoose connection
  conn: typeof mongoose | null;
  // Promise resolving to a connection during initialisation
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // Augment the global object to store the connection across reloads
  var mongoose: MongooseCache | undefined;
}

// Use the cached value if available, otherwise create a new placeholder
const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };
global.mongoose = cached;

// Establish a singleton mongoose connection using the cached object
async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
