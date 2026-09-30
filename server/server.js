import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import config, { validateEnv } from "./src/config/env.js";
import { closeRedis } from "./src/config/redis.js";
import { stopAllWorkers } from "./src/services/queue.service.js";

// Validate required environment configuration
validateEnv();

// Connect to MongoDB
connectDB();

const server = app.listen(config.port, () => {
  console.log(`🟢 [SERVER] Running in ${config.nodeEnv} mode on port ${config.port}`);
});

const gracefulShutdown = async (signal) => {
  console.log(`🛑 [SERVER] Received ${signal}. Starting graceful shutdown...`);
  stopAllWorkers();
  await closeRedis();
  server.close(() => {
    console.log("🛑 [SERVER] HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("🔴 [SERVER] Unhandled Rejection:", err);
  if (config.isProduction) {
    server.close(() => process.exit(1));
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("🔴 [SERVER] Uncaught Exception:", err);
  if (config.isProduction) {
    process.exit(1);
  }
});
