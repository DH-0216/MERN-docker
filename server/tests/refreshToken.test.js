import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import config from "../src/config/env.js";
import { closeRedis } from "../src/config/redis.js";
import { stopAllWorkers } from "../src/services/queue.service.js";

const TEST_EMAIL = "refreshtest@example.com";
const TEST_USER = "refr_usr";
const TEST_PASS = "Password123!";

describe("Enterprise Refresh Token & Rotation (Redis + httpOnly Cookie) Test Suite", () => {
  let initialCookie = "";
  let accessToken = "";

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }
    await User.deleteMany({ email: TEST_EMAIL });
  });

  after(async () => {
    stopAllWorkers();
    await User.deleteMany({ email: TEST_EMAIL });
    await mongoose.disconnect();
    await closeRedis();
  });

  it("1. Registering should return access token and set httpOnly refreshToken cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        userName: TEST_USER,
        email: TEST_EMAIL,
        password: TEST_PASS,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token, "Access token must be present in response body");

    // Verify Set-Cookie header contains httpOnly refreshToken
    const cookies = res.headers["set-cookie"];
    assert.ok(cookies && cookies.length > 0, "Set-Cookie header must be sent");
    const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
    assert.ok(refreshCookie, "refreshToken cookie must be present");
    assert.match(refreshCookie, /HttpOnly/i, "Cookie must have HttpOnly flag");
    assert.match(refreshCookie, /Path=\/api\/v1\/auth/i, "Cookie must have restricted path");

    initialCookie = refreshCookie.split(";")[0];
    accessToken = res.body.data.token;
  });

  it("2. Logging in should issue a fresh access token and refresh cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: TEST_EMAIL,
        password: TEST_PASS,
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);

    const cookies = res.headers["set-cookie"];
    const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
    assert.ok(refreshCookie);
    initialCookie = refreshCookie.split(";")[0];
    accessToken = res.body.data.token;
  });

  it("3. POST /api/v1/auth/refresh with valid cookie should rotate refresh token and issue new access token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [initialCookie]);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token, "New access token must be returned");
    assert.notEqual(res.body.data.token, accessToken, "New access token must differ from old one");

    // Verify token rotation: new refresh token cookie must be set
    const cookies = res.headers["set-cookie"];
    const newRefreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
    assert.ok(newRefreshCookie);
    assert.notEqual(newRefreshCookie.split(";")[0], initialCookie, "Refresh token must rotate to a new value");

    // Save the new rotated cookie
    const secondCookie = newRefreshCookie.split(";")[0];

    // 4. Token Reuse Detection: Attempting to use the OLD rotated cookie again must trigger breach detection!
    const reuseAttempt = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [initialCookie]);

    assert.equal(reuseAttempt.status, 401, "Reusing a rotated token must be strictly rejected");
    assert.match(reuseAttempt.body.message, /reuse|invalid|security/i);

    // Because reuse was detected, the new token in that session should also be revoked!
    const subsequentCheck = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [secondCookie]);

    assert.equal(subsequentCheck.status, 401, "All family tokens must be invalidated on reuse breach");
  });

  it("4. POST /api/v1/auth/refresh without cookie should return 401 Unauthorized", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it("5. POST /api/v1/auth/logout should clear cookie and revoke session in Redis", async () => {
    // Log in again to get fresh session
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASS });

    const activeCookie = loginRes.headers["set-cookie"]
      .find((c) => c.startsWith("refreshToken="))
      .split(";")[0];

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", [activeCookie])
      .set("Authorization", `Bearer ${loginRes.body.data.token}`);

    assert.equal(logoutRes.status, 200);

    // Verify cookie was cleared (expires in the past / Max-Age=0)
    const cookies = logoutRes.headers["set-cookie"];
    const clearedCookie = cookies.find((c) => c.startsWith("refreshToken="));
    assert.ok(clearedCookie);
    assert.ok(clearedCookie.includes("Max-Age=0") || clearedCookie.includes("Expires="));

    // Subsequent refresh attempt with logged-out cookie must be rejected
    const afterLogoutRefresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [activeCookie]);

    assert.equal(afterLogoutRefresh.status, 401);
  });
});
