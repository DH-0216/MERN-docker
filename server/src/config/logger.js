import pino from "pino";
import crypto from "crypto";
import config, { isTestEnv } from "./env.js";

// Pino logger configured for cloud-native structured JSON output
export const logger = pino({
  level:
    process.env.LOG_LEVEL ||
    (isTestEnv ? "silent" : config.isProduction ? "info" : "debug"),
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: undefined, // Strip pid & hostname for clean container logs
});

/**
 * Express middleware for Request Correlation IDs (X-Request-ID) and Structured JSON logging.
 * - Extracts or assigns a unique UUID correlation ID.
 * - Propagates X-Request-ID header on outgoing HTTP response.
 * - Attaches req.id and req.log (child logger with requestId).
 * - Emits structured JSON log on response finish with responseTimeMs, method, path, userId.
 */
export const requestCorrelationMiddleware = (req, res, next) => {
  const incomingId = req.headers["x-request-id"];
  const requestId =
    typeof incomingId === "string" && incomingId.trim().length > 0
      ? incomingId.trim()
      : crypto.randomUUID();

  req.id = requestId;
  res.setHeader("X-Request-ID", requestId);

  // Attach child logger scoped to this specific requestId
  req.log = logger.child({ requestId });

  const startHrTime = process.hrtime.bigint();

  res.on("finish", () => {
    const endHrTime = process.hrtime.bigint();
    const responseTimeMs = Number((endHrTime - startHrTime) / 1000000n);

    const logEntry = {
      timestamp: new Date().toISOString(),
      level:
        res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      requestId,
      userId: req.user?._id?.toString() || req.user?.id || undefined,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTimeMs,
    };

    if (res.statusCode >= 500) {
      logger.error(logEntry);
    } else if (res.statusCode >= 400) {
      logger.warn(logEntry);
    } else {
      logger.info(logEntry);
    }
  });

  next();
};

export default logger;
