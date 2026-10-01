import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  failed?: boolean;
  failedAt?: number;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null, failed: false, failedAt: 0 };
}
const cached = global.mongoose;

export function isDbConnected(): boolean {
  return Boolean(cached.conn && cached.conn.connection?.readyState === 1);
}

export function isDbFailed(): boolean {
  if (!cached.failed) return false;
  if (Date.now() - (cached.failedAt || 0) < 30000) {
    return true;
  }
  cached.failed = false;
  return false;
}

async function connectDB(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (cached.failed) {
    if (Date.now() - (cached.failedAt || 0) < 30000) {
      throw new Error(
        "MongoDB connection previously failed. Skipping to prevent blocking local development rendering."
      );
    }
    cached.failed = false;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2500, // Fast failover to prevent blocking page transitions
      connectTimeoutMS: 2500,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.failed = true;
    cached.failedAt = Date.now();
    throw e;
  }

  return cached.conn;
}

export default connectDB;
