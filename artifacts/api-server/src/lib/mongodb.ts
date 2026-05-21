import mongoose from "mongoose";
import { logger } from "./logger.js";

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  await mongoose.connect(uri, {
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
    serverSelectionTimeoutMS: 10000,
  });
  isConnected = true;
  logger.info("MongoDB connected");
}
