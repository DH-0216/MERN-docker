import cors from "cors";
import config from "./env.js";

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (such as mobile apps, curl, server-to-server, or same-origin)
    if (!origin) {
      return callback(null, true);
    }

    if (
      !config.isProduction ||
      config.allowedOrigins.includes("*") ||
      config.allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }

    return callback(
      new Error(`CORS Error: Origin ${origin} is not allowed by policy.`),
    );
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400, // 24 hours preflight cache
};

export default cors(corsOptions);
