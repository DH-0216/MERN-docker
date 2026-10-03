import { redisClient, isRedisConnected } from "../config/redis.js";

const workers = new Map();
const intervals = new Map();
const retryTimeouts = new Set();
const memoryDlq = new Map(); // queueName -> array of DLQ records

// Default retry policy: 3 retries with exponential backoff (5s, 15s, 60s)
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_BACKOFF_DELAYS = [5000, 15000, 60000];

/**
 * Enqueue a new background job into a Redis list or fallback handler.
 * @param {string} queueName
 * @param {object} payload
 * @param {object} [options]
 * @param {number} [options.maxRetries=3]
 * @param {number[]} [options.backoffDelays=[5000, 15000, 60000]]
 * @returns {Promise<{ id: string, enqueued: boolean }>}
 */
export const enqueueJob = async (queueName, payload, options = {}) => {
  const job = {
    id: options.id || `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queue: queueName,
    payload,
    attempts: 0,
    maxRetries:
      typeof options.maxRetries === "number"
        ? options.maxRetries
        : DEFAULT_MAX_RETRIES,
    backoffDelays: Array.isArray(options.backoffDelays)
      ? options.backoffDelays
      : DEFAULT_BACKOFF_DELAYS,
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

  // Fallback: If Redis is unavailable, process via worker handler with failure retries
  const workerHandler = workers.get(queueName);
  if (workerHandler) {
    setImmediate(async () => {
      try {
        await workerHandler(job);
      } catch (err) {
        await handleJobFailure(queueName, job, err);
      }
    });
  }

  return { id: job.id, enqueued: false, fallbackExecuted: !!workerHandler };
};

/**
 * Process job failure: applies exponential backoff retry or routes to Dead-Letter Queue (DLQ).
 */
const handleJobFailure = async (queueName, job, error) => {
  job.attempts = (job.attempts || 0) + 1;
  job.lastError = error.message;
  job.failedAt = new Date().toISOString();

  const maxRetries = job.maxRetries ?? DEFAULT_MAX_RETRIES;
  const backoffDelays = job.backoffDelays ?? DEFAULT_BACKOFF_DELAYS;

  if (job.attempts < maxRetries) {
    // Determine backoff delay: 5s, 15s, 60s...
    const delayMs = backoffDelays[job.attempts - 1] ?? backoffDelays[backoffDelays.length - 1];

    console.warn(
      `⚠️ [QUEUE RETRY] Job ${job.id} in "${queueName}" failed (attempt ${job.attempts}/${maxRetries}). Retrying in ${delayMs}ms. Error: ${error.message}`,
    );

    const timer = setTimeout(async () => {
      retryTimeouts.delete(timer);
      if (isRedisConnected()) {
        try {
          await redisClient.lpush(`queue:${queueName}`, JSON.stringify(job));
        } catch (pushErr) {
          console.error(
            `🔴 [QUEUE ERROR] Failed to re-enqueue retry job ${job.id}:`,
            pushErr.message,
          );
        }
      } else {
        const handler = workers.get(queueName);
        if (handler) {
          try {
            await handler(job);
          } catch (retryErr) {
            await handleJobFailure(queueName, job, retryErr);
          }
        }
      }
    }, delayMs);

    timer.unref();
    retryTimeouts.add(timer);
  } else {
    // Max retries exceeded: Route to Dead-Letter Queue (DLQ)
    const dlqKey = `queue:dlq:${queueName}`;
    const dlqRecord = {
      ...job,
      deadLetteredAt: new Date().toISOString(),
      failureReason: error.message,
      stack: error.stack,
    };

    console.error(
      `🔴 [QUEUE DLQ] Job ${job.id} permanently failed after ${job.attempts} attempts in "${queueName}". Moved to Dead-Letter Queue (${dlqKey}). Error: ${error.message}`,
    );

    if (isRedisConnected()) {
      try {
        await redisClient.lpush(dlqKey, JSON.stringify(dlqRecord));
      } catch (dlqErr) {
        console.error(
          `🔴 [QUEUE DLQ ERROR] Failed to move job ${job.id} to DLQ:`,
          dlqErr.message,
        );
      }
    }

    if (!memoryDlq.has(queueName)) {
      memoryDlq.set(queueName, []);
    }
    memoryDlq.get(queueName).unshift(dlqRecord);
  }
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
        await handleJobFailure(queueName, job, procErr);
      }
    } catch (err) {
      console.warn(`⚠️ [QUEUE WORKER ERROR] Poll failed for "${queueName}":`, err.message);
    }
  }, pollIntervalMs);

  intervalId.unref();
  intervals.set(queueName, intervalId);
};

/**
 * Retrieve items from the Dead-Letter Queue (DLQ) for inspection or admin review.
 * @param {string} queueName
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export const getDlqJobs = async (queueName, limit = 50) => {
  if (isRedisConnected()) {
    try {
      const rawJobs = await redisClient.lrange(`queue:dlq:${queueName}`, 0, limit - 1);
      if (rawJobs && rawJobs.length > 0) {
        return rawJobs.map((raw) => JSON.parse(raw));
      }
    } catch (error) {
      console.error(`🔴 [QUEUE DLQ ERROR] Failed to retrieve DLQ for "${queueName}":`, error.message);
    }
  }
  return (memoryDlq.get(queueName) || []).slice(0, limit);
};

/**
 * Re-drive / retry a dead-lettered job by popping from DLQ and pushing back to active queue.
 * @param {string} queueName
 * @param {string} jobId
 */
export const retryDlqJob = async (queueName, jobId) => {
  if (isRedisConnected()) {
    try {
      const dlqKey = `queue:dlq:${queueName}`;
      const rawJobs = await redisClient.lrange(dlqKey, 0, -1);
      for (const raw of rawJobs) {
        const parsed = JSON.parse(raw);
        if (parsed.id === jobId) {
          await redisClient.lrem(dlqKey, 1, raw);
          parsed.attempts = 0; // Reset attempts on manual re-drive
          await redisClient.lpush(`queue:${queueName}`, JSON.stringify(parsed));
          return true;
        }
      }
    } catch (error) {
      console.error(`🔴 [QUEUE DLQ ERROR] Failed to retry DLQ job ${jobId}:`, error.message);
    }
  }

  // Memory fallback re-drive
  const list = memoryDlq.get(queueName) || [];
  const idx = list.findIndex((j) => j.id === jobId);
  if (idx !== -1) {
    const [job] = list.splice(idx, 1);
    job.attempts = 0;
    enqueueJob(queueName, job.payload);
    return true;
  }

  return false;
};

/**
 * Purge Dead-Letter Queue for a given queue.
 */
export const clearDlq = async (queueName) => {
  memoryDlq.delete(queueName);
  if (isRedisConnected()) {
    try {
      await redisClient.del(`queue:dlq:${queueName}`);
    } catch {}
  }
  return true;
};

/**
 * Stop all active background queue workers and scheduled retries.
 */
export const stopAllWorkers = () => {
  for (const intervalId of intervals.values()) {
    clearInterval(intervalId);
  }
  intervals.clear();

  for (const timer of retryTimeouts) {
    clearTimeout(timer);
  }
  retryTimeouts.clear();

  workers.clear();
};
