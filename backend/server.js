import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import config, { validateEnv } from "./src/config/env.js";

// Validate required environment configuration
validateEnv();

// Connect to MongoDB
connectDB();

const server = app.listen(config.port, () => {
  console.log(`🟢 [SERVER] Running in ${config.nodeEnv} mode on port ${config.port}`);
});

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
