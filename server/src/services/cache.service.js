import { redisClient, isRedisConnected } from "../config/redis.js";

/**
 * Retrieve cached data by key.
 * Returns null if not found, expired, or if Redis is unreachable.
 */
export const getCache = async (key) => {
  if (!isRedisConnected()) return null;

  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.warn(`⚠️ [CACHE ERROR] Failed to get key "${key}":`, error.message);
    return null;
  }
};

/**
 * Save data to cache with a Time-To-Live (TTL) in seconds.
 */
export const setCache = async (key, value, ttlSeconds = 60) => {
  if (!isRedisConnected()) return false;

  try {
    const serialized = JSON.stringify(value);
    await redisClient.set(key, serialized, "EX", ttlSeconds);
    return true;
  } catch (error) {
    console.warn(`⚠️ [CACHE ERROR] Failed to set key "${key}":`, error.message);
    return false;
  }
};

/**
 * Delete a specific key from cache.
 */
export const deleteCache = async (key) => {
  if (!isRedisConnected()) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.warn(`⚠️ [CACHE ERROR] Failed to del key "${key}":`, error.message);
    return false;
  }
};

/**
 * Invalidate all keys matching a glob pattern (e.g. "admin:users:*").
 * Uses SCAN instead of KEYS to avoid blocking the Redis event loop.
 */
export const deleteCachePattern = async (pattern) => {
  if (!isRedisConnected()) return false;

  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redisClient.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== "0");

    return true;
  } catch (error) {
    console.warn(
      `⚠️ [CACHE ERROR] Failed to invalidate pattern "${pattern}":`,
      error.message,
    );
    return false;
  }
};
