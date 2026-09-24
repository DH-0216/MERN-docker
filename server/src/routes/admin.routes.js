import { Router } from "express";
import authenticate, { authorize } from "../middleware/auth.middleware.js";
import {
  validate,
  adminCreateUserSchema,
  updateRoleSchema,
} from "../middleware/validate.middleware.js";
import {
  getStats,
  listUsers,
  changeUserRole,
  removeUser,
  createUser,
} from "../controllers/admin.controller.js";

const router = Router();

// Protect all admin routes with authentication and admin role authorization
router.use(authenticate, authorize("admin"));

// Statistics and system health
router.get("/stats", getStats);

// User management endpoints
router.get("/users", listUsers);
router.post("/users", validate(adminCreateUserSchema), createUser);
router.patch("/users/:id/role", validate(updateRoleSchema), changeUserRole);
router.delete("/users/:id", removeUser);

export default router;
