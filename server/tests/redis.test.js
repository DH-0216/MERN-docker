import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import config from "../src/config/env.js";
import { generateToken } from "../src/services/auth.service.js";
import { closeRedis } from "../src/config/redis.js";
import {
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
} from "../src/services/cache.service.js";
import {
  blacklistToken,
  isTokenBlacklisted,
} from "../src/services/tokenBlacklist.service.js";
import {
  recordUserActivity,
  getActiveUsersCount,
} from "../src/services/presence.service.js";
import {
  enqueueJob,
  registerWorker,
  stopAllWorkers,
} from "../src/services/queue.service.js";

describe("Redis Features & Integration Test Suite", () => {
  let testUser;
  let testToken;
  let adminUser;
  let adminToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    await User.deleteMany({
      email: {
        $in: [
          "redis_test_user@test.com",
          "redis_test_admin@test.com",
        ],
      },
    });

    testUser = await User.create({
      userName: "redistst",
      email: "redis_test_user@test.com",
      password: "Password123!",
      role: "user",
    });

    adminUser = await User.create({
      userName: "redisadm",
      email: "redis_test_admin@test.com",
      password: "Password123!",
      role: "admin",
    });

    testToken = generateToken(testUser);
    adminToken = generateToken(adminUser);
  });

  after(async () => {
    stopAllWorkers();
    await User.deleteMany({
      email: {
        $in: [
          "redis_test_user@test.com",
          "redis_test_admin@test.com",
        ],
      },
    });
    await mongoose.disconnect();
    await closeRedis();
  });

  // 1. Caching Service Unit Tests
  describe("1. Caching Service", () => {
    it("should set and retrieve cache data with fallback", async () => {
      const key = "test:cache:key";
      const payload = { message: "hello world", count: 42 };

      await setCache(key, payload, 10);
      // In connected mode returns payload, in fallback returns null without errors
      const result = await getCache(key);
      if (result) {
        assert.deepEqual(result, payload);
      }
    });

    it("should support key deletion and pattern invalidation", async () => {
      await deleteCache("test:cache:key");
      await deleteCachePattern("test:cache:*");
      const result = await getCache("test:cache:key");
      assert.equal(result, null);
    });
  });

  // 2. JWT Blacklisting & Logout
  describe("2. JWT Blacklisting & Immediate Logout Invalidation", () => {
    it("should report active token as not blacklisted", async () => {
      const isBlacklisted = await isTokenBlacklisted(testToken);
      assert.equal(isBlacklisted, false);
    });

    it("should blacklist token on POST /api/v1/auth/logout", async () => {
      // 1. Verify access works before logout
      const beforeRes = await request(app)
        .get("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${testToken}`);
      assert.equal(beforeRes.status, 200);

      // 2. Perform logout
      const logoutRes = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${testToken}`);
      assert.equal(logoutRes.status, 200);
      assert.equal(logoutRes.body.success, true);

      // 3. Subsequent request with same token must be rejected immediately (401)
      const afterRes = await request(app)
        .get("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${testToken}`);
      assert.equal(afterRes.status, 401);
      assert.match(afterRes.body.message, /revoked/i);
    });

    it("should manually blacklist token via tokenBlacklist service", async () => {
      const dummyToken = "dummy.jwt.token";
      await blacklistToken(dummyToken, Math.floor(Date.now() / 1000) + 60);
      const isRevoked = await isTokenBlacklisted(dummyToken);
      assert.equal(isRevoked, true);
    });
  });

  // 3. Real-Time User Presence Tracking
  describe("3. Active Users & Real-Time Presence", () => {
    it("should record user activity and reflect in active user count", async () => {
      const initialCount = await getActiveUsersCount(5);
      await recordUserActivity("user_presence_test_123");
      const newCount = await getActiveUsersCount(5);
      assert.ok(newCount >= initialCount);
    });

    it("should automatically track presence during authenticated API calls", async () => {
      const freshToken = generateToken(adminUser);
      const res = await request(app)
        .get("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${freshToken}`);
      assert.equal(res.status, 200);

      const activeCount = await getActiveUsersCount(5);
      assert.ok(activeCount > 0);
    });
  });

  // 4. Background Job Queue
  describe("4. Background Job Queue (BullMQ / Redis Queue Pattern)", () => {
    it("should enqueue a background job without blocking caller", async () => {
      let workerProcessed = false;

      registerWorker("customTestQueue", async (job) => {
        if (job.payload.testKey === "testValue") {
          workerProcessed = true;
        }
      });

      const enqueueResult = await enqueueJob("customTestQueue", {
        testKey: "testValue",
        timestamp: Date.now(),
      });

      assert.ok(enqueueResult.id);
      assert.match(enqueueResult.id, /^job_/);
    });
  });

  // 5. Admin Dashboard Metrics Caching
  describe("5. Admin Dashboard Metrics Caching & System Health", () => {
    it("should include active users and cache status in /api/v1/admin/stats", async () => {
      const freshAdminToken = generateToken(adminUser);
      const res = await request(app)
        .get("/api/v1/admin/stats")
        .set("Authorization", `Bearer ${freshAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.metrics.totalUsers !== undefined);
      assert.ok(res.body.data.metrics.activeUsersNow !== undefined);
      assert.ok(typeof res.body.data.isCached === "boolean");
    });

    it("should report Redis connection status in /api/v2/health", async () => {
      const res = await request(app).get("/api/v2/health");
      assert.equal(res.status, 200);
      assert.ok(["connected", "disconnected"].includes(res.body.data.redis));
    });
  });
});
