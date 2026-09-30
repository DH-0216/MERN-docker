import { redisClient, isRedisConnected } from "../config/redis.js";

const workers = new Map();
const intervals = new Map();

/**
 * Enqueue a new background job into a Redis list.
 * @param {string} queueName
 * @param {object} payload
 * @returns {Promise<{ id: string, enqueued: boolean }>}
 */
export const enqueueJob = async (queueName, payload) => {
  const job = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queue: queueName,
    payload,
    createdAt: new Date().toISOString(),
  };

  if (isRedisConnected()) {
    try {
      await redisClient.lpush(`queue:${queueName}`, JSON.stringify(job));
      return { id: job.id, enqueued: true };
    } catch (error) {
      console.warn(`⚠️ [QUEUE ERROR] Failed to push to "${queueName}":`, error.message);
    }
  }

  // Fallback: If Redis is unavailable, process immediately if worker exists
  const workerHandler = workers.get(queueName);
  if (workerHandler) {
    setImmediate(async () => {
      try {
        await workerHandler(job);
      } catch (err) {
        console.error(`🔴 [QUEUE WORKER ERROR] Fallback execution failed:`, err.message);
      }
    });
  }

  return { id: job.id, enqueued: false, fallbackExecuted: !!workerHandler };
};

/**
 * Register a background worker that continuously pulls and processes jobs.
 * @param {string} queueName
 * @param {Function} handler - async (job) => Promise<void>
 * @param {number} pollIntervalMs - Polling interval in ms (default: 1000ms)
 */
export const registerWorker = (queueName, handler, pollIntervalMs = 1000) => {
  workers.set(queueName, handler);

  if (intervals.has(queueName)) {
    clearInterval(intervals.get(queueName));
  }

  const intervalId = setInterval(async () => {
    if (!isRedisConnected()) return;

    try {
      // Pop oldest job from the right end of the list (FIFO)
      const rawJob = await redisClient.rpop(`queue:${queueName}`);
      if (!rawJob) return;

      const job = JSON.parse(rawJob);
      try {
        await handler(job);
      } catch (procErr) {
        console.error(
          `🔴 [QUEUE WORKER ERROR] Job ${job.id} failed in "${queueName}":`,
          procErr.message,
        );
      }
    } catch (err) {
      console.warn(`⚠️ [QUEUE WORKER ERROR] Poll failed for "${queueName}":`, err.message);
    }
  }, pollIntervalMs);

  intervalId.unref();
  intervals.set(queueName, intervalId);
};

/**
 * Stop all active background queue workers (for graceful shutdown or test teardown).
 */
export const stopAllWorkers = () => {
  for (const intervalId of intervals.values()) {
    clearInterval(intervalId);
  }
  intervals.clear();
  workers.clear();
};

// Initialize default background email worker
registerWorker("emailQueue", async (job) => {
  const { type, email, userName } = job.payload;
  console.log(
    `📨 [BACKGROUND EMAIL WORKER] Processed "${type}" notification for ${userName || "User"} (${email}) [Job ID: ${job.id}]`,
  );
});
