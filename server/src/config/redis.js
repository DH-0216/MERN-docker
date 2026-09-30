import Redis from "ioredis";
import config from "./env.js";

let redisClient = null;
let isConnected = false;

if (config.redisEnabled) {
  redisClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    retryStrategy(times) {
      // Reconnect with backoff capped at 3s so it automatically reconnects when Redis starts
      return Math.min(times * 300, 3000);
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
