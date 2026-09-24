import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import config from "../src/config/env.js";
import { generateToken } from "../src/services/auth.service.js";

describe("Admin Dashboard & Management Test Suite", () => {
  let regularUser;
  let adminUser;
  let regularToken;
  let adminToken;
  let dummyUser;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri);
    }

    // Clean up test emails
    await User.deleteMany({
      email: {
        $in: [
          "admin_test_reg@test.com",
          "admin_test_adm@test.com",
          "admin_test_dummy@test.com",
          "admin_created@test.com",
        ],
      },
    });

    regularUser = await User.create({
      userName: "admtestreg",
      email: "admin_test_reg@test.com",
      password: "Password123!",
      role: "user",
    });

    adminUser = await User.create({
      userName: "admtestadm",
      email: "admin_test_adm@test.com",
      password: "Password123!",
      role: "admin",
    });

    dummyUser = await User.create({
      userName: "admdummy",
      email: "admin_test_dummy@test.com",
      password: "Password123!",
      role: "user",
    });

    regularToken = generateToken(regularUser);
    adminToken = generateToken(adminUser);
  });

  after(async () => {
    await User.deleteMany({
      email: {
        $in: [
          "admin_test_reg@test.com",
          "admin_test_adm@test.com",
          "admin_test_dummy@test.com",
          "admin_created@test.com",
        ],
      },
    });
    await mongoose.disconnect();
  });

  describe("Admin Route Authentication & Authorization", () => {
    it("should reject unauthenticated request to /api/v1/admin/stats with 401", async () => {
      const res = await request(app).get("/api/v1/admin/stats");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it("should reject regular user request to /api/v1/admin/stats with 403", async () => {
      const res = await request(app)
        .get("/api/v1/admin/stats")
        .set("Authorization", `Bearer ${regularToken}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    it("should allow admin access to /api/v1/admin/stats with 200", async () => {
      const res = await request(app)
        .get("/api/v1/admin/stats")
        .set("Authorization", `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.metrics);
      assert.ok(res.body.data.system);
      assert.equal(typeof res.body.data.metrics.totalUsers, "number");
    });
  });

  describe("User Management Operations", () => {
    it("should return paginated user list for admin", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users?page=1&limit=5")
        .set("Authorization", `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.users));
      assert.ok(res.body.data.pagination);
      assert.equal(res.body.data.pagination.currentPage, 1);
    });

    it("should filter users by search term", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users?search=admdummy")
        .set("Authorization", `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.users.length, 1);
      assert.equal(res.body.data.users[0].userName, "admdummy");
    });

    it("should allow admin to create a new user account directly", async () => {
      const res = await request(app)
        .post("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          userName: "admcreate",
          email: "admin_created@test.com",
          password: "Password123!",
          role: "user",
        });
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.email, "admin_created@test.com");
    });

    it("should allow admin to promote a user to admin", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${dummyUser._id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "admin" });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.role, "admin");
    });

    it("should prevent admin from demoting their own account", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${adminUser._id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "user" });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /cannot demote your own/i);
    });

    it("should prevent admin from deleting their own account via dashboard", async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/users/${adminUser._id}`)
        .set("Authorization", `Bearer ${adminToken}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /cannot delete your own/i);
    });

    it("should allow admin to delete target user account", async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/users/${dummyUser._id}`)
        .set("Authorization", `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify deletion in database
      const check = await User.findById(dummyUser._id);
      assert.equal(check, null);
    });
  });
});
