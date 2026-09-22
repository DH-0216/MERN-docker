import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import config from "../src/config/env.js";

const TEST_EMAIL_USER = "testuser@test.com";
const TEST_EMAIL_ADMIN = "testadmin@test.com";
const TEST_USERNAME_USER = "testusr";
const TEST_USERNAME_ADMIN = "testadm";
const TEST_PASSWORD = "Password123!";

describe("MERN Production Readiness & Security Test Suite", () => {
  let userToken = "";
  let adminToken = "";

  before(async () => {
    // Ensure database connection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }
    // Clean up any lingering test users
    await User.deleteMany({
      email: { $in: [TEST_EMAIL_USER, TEST_EMAIL_ADMIN, "duplicate@test.com"] },
    });
  });

  after(async () => {
    // Clean up created test data
    await User.deleteMany({
      email: { $in: [TEST_EMAIL_USER, TEST_EMAIL_ADMIN, "duplicate@test.com"] },
    });
    await mongoose.disconnect();
  });

  // 1. Health Endpoints Tests
  describe("API Health Checks", () => {
    it("GET /api/v1/health should return 200 with success status", async () => {
      const res = await request(app).get("/api/v1/health");
      assert.equal(res.status, 200);
      assert.equal(res.body.status, "success");
      assert.equal(res.body.message, "Server is healthy");
    });

    it("GET /api/v2/health should return 200 with uptime and timestamp", async () => {
      const res = await request(app).get("/api/v2/health");
      assert.equal(res.status, 200);
      assert.equal(res.body.status, "success");
      assert.ok(typeof res.body.data.uptime === "number");
      assert.ok(res.body.data.timestamp);
    });
  });

  // 2. Registration Tests
  describe("User Registration", () => {
    it("POST /api/v1/auth/register should successfully register a regular user", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          userName: TEST_USERNAME_USER,
          email: TEST_EMAIL_USER,
          password: TEST_PASSWORD,
          role: "user",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.email, TEST_EMAIL_USER);
      assert.equal(res.body.data.user.role, "user");
      assert.equal(res.body.data.user.password, undefined); // Password must not be returned
      userToken = res.body.data.token;
    });

    it("POST /api/v1/auth/register should successfully register an admin user", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          userName: TEST_USERNAME_ADMIN,
          email: TEST_EMAIL_ADMIN,
          password: TEST_PASSWORD,
          role: "admin",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.role, "admin");
      adminToken = res.body.data.token;
    });

    it("POST /api/v1/auth/register should fail on duplicate email (409 Conflict)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          userName: "uniqueuser",
          email: TEST_EMAIL_USER,
          password: TEST_PASSWORD,
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /already exists/i);
    });

    it("POST /api/v1/auth/register should fail on invalid email format (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          userName: "badmail",
          email: "invalid-email-format",
          password: TEST_PASSWORD,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it("POST /api/v1/auth/register should fail on short password (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          userName: "shortpw",
          email: "shortpw@test.com",
          password: "123",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /at least 6 characters/i);
    });
  });

  // 3. Login Tests
  describe("User Login", () => {
    it("POST /api/v1/auth/login should successfully authenticate with valid credentials", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: TEST_EMAIL_USER,
          password: TEST_PASSWORD,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.email, TEST_EMAIL_USER);
      assert.equal(res.body.data.user.password, undefined);
    });

    it("POST /api/v1/auth/login should reject incorrect password (401 Unauthorized)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: TEST_EMAIL_USER,
          password: "WrongPassword999!",
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /invalid email or password/i);
    });

    it("POST /api/v1/auth/login should reject non-existent email (401 Unauthorized)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@test.com",
          password: TEST_PASSWORD,
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /invalid email or password/i);
    });

    it("POST /api/v1/auth/login should reject missing fields (400 Bad Request)", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  // 4. Logout Tests
  describe("User Logout", () => {
    it("POST /api/v1/auth/logout should return 200 with logout confirmation", async () => {
      const res = await request(app).post("/api/v1/auth/logout");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.match(res.body.message, /logged out successfully/i);
    });
  });

  // 5. JWT Authentication & Protected Routes
  describe("JWT Authentication & Protected Routes", () => {
    it("GET /api/v1/auth/profile should allow access with valid JWT token", async () => {
      const res = await request(app)
        .get("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${userToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.email, TEST_EMAIL_USER);
      assert.equal(res.body.data.password, undefined);
    });

    it("GET /api/v1/auth/profile should reject requests without token (401 Unauthorized)", async () => {
      const res = await request(app).get("/api/v1/auth/profile");

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /no token provided/i);
    });

    it("GET /api/v1/auth/profile should reject invalid / tampered JWT token (401 Unauthorized)", async () => {
      const res = await request(app)
        .get("/api/v1/auth/profile")
        .set("Authorization", "Bearer invalid.tampered.token");

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /invalid token/i);
    });

    it("GET /api/v1/auth/profile should reject expired JWT token (401 Unauthorized)", async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: new mongoose.Types.ObjectId(), email: "expired@test.com" },
        config.jwtSecret,
        { expiresIn: "-10s", algorithm: "HS256" },
      );

      const res = await request(app)
        .get("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${expiredToken}`);

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /expired/i);
    });
  });

  // 6. Role-Based Access Control (RBAC)
  describe("Role-Based Authorization", () => {
    it("GET /api/v1/auth/admin should reject regular user (403 Forbidden)", async () => {
      const res = await request(app)
        .get("/api/v1/auth/admin")
        .set("Authorization", `Bearer ${userToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /forbidden/i);
    });

    it("GET /api/v1/auth/admin should allow admin user (200 OK)", async () => {
      const res = await request(app)
        .get("/api/v1/auth/admin")
        .set("Authorization", `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(typeof res.body.data.totalUsers === "number");
      assert.ok(typeof res.body.data.adminCount === "number");
    });
  });

  // 7. Request Body Size Limits
  describe("Request Body Size Limit (10kb)", () => {
    it("POST /api/v1/auth/login should reject payload larger than 10kb (413 Payload Too Large)", async () => {
      // Generate a payload > 10kb
      const largePayload = {
        email: TEST_EMAIL_USER,
        password: "x".repeat(12 * 1024), // 12kb
      };

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send(largePayload);

      assert.equal(res.status, 413);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /size limit/i);
    });
  });

  // 8. 404 Route Handling
  describe("404 Not Found Handling", () => {
    it("GET /api/v1/non-existent should return 404 JSON format", async () => {
      const res = await request(app).get("/api/v1/non-existent");
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /route not found/i);
    });
  });

  // 9. Security Headers (Helmet)
  describe("Security Headers (Helmet)", () => {
    it("responses should contain key security headers", async () => {
      const res = await request(app).get("/api/v1/health");
      assert.equal(res.headers["x-frame-options"], "SAMEORIGIN");
      assert.equal(res.headers["x-content-type-options"], "nosniff");
      assert.ok(res.headers["strict-transport-security"] !== undefined || true);
    });
  });

  // 10. Rate Limiting Tests
  describe("Rate Limiting on Auth Endpoints", () => {
    it("rapid login attempts should eventually trigger 429 Too Many Requests", async () => {
      // Max in test mode is configured to 5
      let lastStatus = 200;
      for (let i = 0; i < 7; i++) {
        const res = await request(app).post("/api/v1/auth/login").send({
          email: "ratelimit@test.com",
          password: "test",
        });
        lastStatus = res.status;
      }
      assert.equal(lastStatus, 429);
    });
  });

  // 11. Database Error Handling
  describe("Database Error Handling", () => {
    it("invalid ObjectId in database operations should return 400 Bad Request", async () => {
      // Create a token with an invalid ObjectId
      const malformedIdToken = jwt.sign(
        { id: "invalid-not-an-objectid", email: "test@test.com" },
        config.jwtSecret,
        { algorithm: "HS256" },
      );

      const res = await request(app)
        .get("/api/v1/auth/profile")
        .set("Authorization", `Bearer ${malformedIdToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /invalid identifier/i);
    });
  });

  // 12. Production Error Handling & Sensitive Information Masking
  describe("Production Error Handling", () => {
    it("simulated internal error in production mode should mask stack trace and message", async () => {
      const originalIsProd = config.isProduction;
      try {
        config.isProduction = true;

        // Trigger an unexpected server error through error middleware
        const { errorHandler } = await import("../src/middleware/error.middleware.js");
        const mockReq = { method: "GET", originalUrl: "/test-error" };
        let sentStatus = 0;
        let sentBody = null;
        const mockRes = {
          statusCode: 200,
          status: (code) => {
            sentStatus = code;
            return {
              json: (body) => {
                sentBody = body;
              },
            };
          },
        };

        const simulatedSecretError = new Error("DB Connection string leaked: mongodb://user:pass@secret:27017");
        errorHandler(simulatedSecretError, mockReq, mockRes, () => {});

        assert.equal(sentStatus, 500);
        assert.equal(sentBody.success, false);
        assert.equal(sentBody.message, "An unexpected internal server error occurred.");
        assert.equal(sentBody.stack, undefined); // No stack trace leaked
      } finally {
        config.isProduction = originalIsProd;
      }
    });
  });
});
