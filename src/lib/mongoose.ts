import mongoose from "mongoose";
import dotenv from "dotenv"
dotenv.config()

import dns from "dns";

// Set Google's DNS servers
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
]);

const MONGODB_URI = process.env.DB_URL_LS;

// console.log("MONGODB_URI : ",MONGODB_URI);

if (!MONGODB_URI) {
  throw new Error(
    "Please define the DB_URL_LS environment variable inside .env"
  );
}

// In Next.js, we want to cache the connection across hot reloads in development
// to avoid exhausting database connections.
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
