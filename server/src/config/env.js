import "dotenv/config";

const requiredEnv = ["MONGO_URI", "JWT_SECRET"];

export const validateEnv = () => {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const errorMsg = `FATAL: Missing required environment variable(s): ${missing.join(", ")}`;
    console.error(`🔴 [CONFIG ERROR] ${errorMsg}`);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }

  if (
    process.env.JWT_SECRET &&
    (process.env.JWT_SECRET === "your-secret-here" ||
      process.env.JWT_SECRET.length < 32)
  ) {
    console.warn(
      "⚠️ [SECURITY WARNING] JWT_SECRET is using a weak or default value. In production, use a strong random secret with at least 32 characters.",
    );
    if (process.env.NODE_ENV === "production") {
      console.error(
        "🔴 [FATAL] Refusing to start in production with an insecure JWT_SECRET.",
      );
      process.exit(1);
    }
  }
};

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/dockerDB",
  jwtSecret: process.env.JWT_SECRET || "development-fallback-secret-key-32-chars-long!",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8080",
        "http://localhost:80",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:8080",
      ],
};

export default config;
