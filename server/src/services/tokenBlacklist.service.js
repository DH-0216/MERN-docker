import { redisClient, isRedisConnected } from "../config/redis.js";

// In-memory fallback set for testing or during Redis downtime
const memoryBlacklist = new Set();

/**
 * Blacklist a JWT until its natural expiration.
 * @param {string} token - The raw JWT token string
 * @param {number} expTimestamp - The "exp" claim from the decoded token (in seconds)
 */
export const blacklistToken = async (token, expTimestamp) => {
  if (!token) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const remainingTtl = expTimestamp ? expTimestamp - nowSeconds : 3600;

  // If already expired, no need to store
  if (remainingTtl <= 0) return true;

  // Always store in memory fallback
  memoryBlacklist.add(token);
  const timer = setTimeout(() => memoryBlacklist.delete(token), remainingTtl * 1000);
  timer.unref();

  if (isRedisConnected()) {
    try {
      await redisClient.set(`bl:token:${token}`, "revoked", "EX", remainingTtl);
      return true;
    } catch (error) {
      console.warn("⚠️ [BLACKLIST ERROR] Failed to blacklist token in Redis:", error.message);
    }
  }

  return true;
};

/**
 * Check whether a token is blacklisted / revoked.
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export const isTokenBlacklisted = async (token) => {
  if (!token) return false;

  if (memoryBlacklist.has(token)) {
    return true;
  }

  if (isRedisConnected()) {
    try {
      const result = await redisClient.get(`bl:token:${token}`);
      return Boolean(result);
    } catch (error) {
      console.warn("⚠️ [BLACKLIST ERROR] Failed to check token in Redis:", error.message);
    }
  }

  return false;
};
