import { Router } from "express";
import authenticate, { authorize } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";
import {
  validate,
  registerSchema,
  loginSchema,
} from "../middleware/validate.middleware.js";
import {
  deleteAccount,
  getUserProfile,
  getAdminData,
  login,
  logout,
  register,
} from "../controllers/auth.controller.js";

const router = Router();

// Authentication endpoints (protected by strict rate limiting and schema validation)
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", logout);

// Protected user routes
router.get("/profile", authenticate, getUserProfile);
router.delete("/profile", authenticate, deleteAccount);
router.delete("/account", authenticate, deleteAccount);

// Protected admin-only routes (Role-Based Access Control)
router.get("/admin", authenticate, authorize("admin"), getAdminData);

export default router;