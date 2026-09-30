import { redisClient, isRedisConnected } from "../config/redis.js";

// In-memory fallback map for active users
const memoryPresence = new Map();

/**
 * Record user activity timestamp.
 * @param {string} userId
 */
export const recordUserActivity = async (userId) => {
  if (!userId) return;

  const now = Date.now();
  const idStr = userId.toString();

  memoryPresence.set(idStr, now);

  if (isRedisConnected()) {
    try {
      await redisClient.zadd("users:presence", now, idStr);
    } catch (error) {
      console.warn("⚠️ [PRESENCE ERROR] Failed to record presence in Redis:", error.message);
    }
  }
};

/**
 * Get count of active users in the past N minutes (default: 5 minutes).
 * Automatically cleans up stale entries older than the window.
 * @param {number} windowMinutes
 * @returns {Promise<number>}
 */
export const getActiveUsersCount = async (windowMinutes = 5) => {
  const now = Date.now();
  const cutoff = now - windowMinutes * 60 * 1000;

  if (isRedisConnected()) {
    try {
      // Remove stale users who haven't made requests recently
      await redisClient.zremrangebyscore("users:presence", 0, cutoff);
      // Count remaining users with score >= cutoff
      const count = await redisClient.zcount("users:presence", cutoff, "+inf");
      return count;
    } catch (error) {
      console.warn("⚠️ [PRESENCE ERROR] Failed to count presence in Redis:", error.message);
    }
  }

  // Memory fallback
  for (const [id, lastSeen] of memoryPresence.entries()) {
    if (lastSeen < cutoff) {
      memoryPresence.delete(id);
    }
  }
  return memoryPresence.size;
};
