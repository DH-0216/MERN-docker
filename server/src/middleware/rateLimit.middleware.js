import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../config/redis.js";
import { isTestEnv } from "../config/env.js";

/**
 * Instantiate a RedisStore for distributed rate limiting across containers.
 * In unit testing mode or when Redis is not initialized, defaults to MemoryStore.
 */
const createStore = (prefix) => {
  if (isTestEnv || !redisClient) {
    return undefined;
  }

  return new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: `rl:${prefix}:`,
  });
};

// General API rate limiter (applied to all /api routes)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 1000 : 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true, // Allow traffic to proceed if Redis store encounters errors
  store: createStore("general"),
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

// Stricter rate limiter specifically for authentication endpoints (login, register) by IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 1000 : 10, // Limit each IP to 10 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true, // Allow traffic to proceed if Redis store encounters errors
  store: createStore("auth"),
  message: {
    success: false,
    message:
      "Too many authentication attempts from this IP, please try again after 15 minutes.",
  },
  skipSuccessfulRequests: false,
});

/**
 * Account-level rate limiter (Dual-Key Defense)
 * Tracks failed login attempts per target account (rl:account:<email>).
 * Freezes the account after 5 failed attempts per 15 minutes regardless of IP rotation.
 */
export const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each account to 5 failed attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  validate: { keyGeneratorIpFallback: false },
  store: createStore("account"),
  keyGenerator: (req) => {
    const email = req.body?.email;
    return email ? email.toLowerCase().trim() : (req.ip || "unknown");
  },
  skipSuccessfulRequests: true, // Only count failed attempts (4xx/5xx responses)
  message: {
    success: false,
    message:
      "Too many failed login attempts for this account, please try again after 15 minutes.",
  },
});

/**
 * Reset failed login attempts counter for an account upon successful authentication.
 */
export const resetAccountLimit = async (email) => {
  if (!email) return;
  const normalized = email.toLowerCase().trim();
  if (redisClient) {
    try {
      await redisClient.del(`rl:account:${normalized}`);
    } catch {
      // ignore
    }
  }
};
