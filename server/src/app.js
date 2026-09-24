import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import corsMiddleware from "./config/cors.js";
import config from "./config/env.js";
import { generalLimiter } from "./middleware/rateLimit.middleware.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import authRouter from "./routes/auth.routes.js";

const app = express();

// Trust reverse proxy (Nginx) for accurate IP resolution in rate limiting
app.set("trust proxy", 1);

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(corsMiddleware);

// Request body size limits to prevent Denial of Service
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// HTTP request logger
app.use(morgan(config.isProduction ? "combined" : "dev"));

// Root welcome route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to the MERN Docker App API",
    version: "1.0.0",
    environment: config.nodeEnv,
  });
});

// API v1 Router
const v1Router = express.Router();
v1Router.get("/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
  });
});
v1Router.use("/auth", authRouter);

// API v2 Router
const v2Router = express.Router();
v2Router.get("/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// Apply general rate limiting across all API routes
app.use("/api", generalLimiter);

// Mount API version routers
app.use("/api/v1", v1Router);
app.use("/api/v2", v2Router);

// Catch-all 404 handler for undefined routes
app.use(notFoundHandler);

// Centralized production error handler
app.use(errorHandler);

export default app;
