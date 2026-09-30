import Redis from "ioredis";
import config from "./env.js";

let redisClient = null;
let isConnected = false;

if (config.redisEnabled) {
  redisClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false, // Avoid blocking commands when Redis is down
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 5) {
        console.warn("⚠️ [REDIS] Max reconnect attempts reached. Backing off.");
        return null; // Stop endless reconnection attempts
      }
      return Math.min(times * 300, 2000);
    },
    reconnectOnError(err) {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  });

  redisClient.on("connect", () => {
    isConnected = true;
    console.log("🟢 [REDIS] Connected to Redis server");
  });

  redisClient.on("ready", () => {
    isConnected = true;
    console.log("🟢 [REDIS] Ready to accept commands");
  });

  redisClient.on("error", (err) => {
    isConnected = false;
    console.warn("⚠️ [REDIS WARNING] Redis connection issue:", err.message);
  });

  redisClient.on("close", () => {
    isConnected = false;
  });

  redisClient.connect().catch((err) => {
    console.warn(
      "⚠️ [REDIS] Could not establish initial connection. Fallback mode will be active until Redis becomes available:",
      err.message,
    );
  });
}

export const isRedisConnected = () => isConnected && redisClient !== null;

export const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log("🔌 [REDIS] Disconnected cleanly");
    } catch {
      redisClient.disconnect();
    }
  }
};

export { redisClient };
export default redisClient;
