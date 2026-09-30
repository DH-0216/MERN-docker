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

// Stricter rate limiter specifically for authentication endpoints (login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 attempts per 15 minutes
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
