import mongoose from "mongoose";
import config from "./env.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`🟢 [DATABASE] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`🔴 [DATABASE ERROR] Connection failed: ${error.message}`);
    if (config.isProduction) {
      console.error("🔴 [FATAL] Database connection failed in production. Exiting process.");
      process.exit(1);
    }
  }
};

export default connectDB;
