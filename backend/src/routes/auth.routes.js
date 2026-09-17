import {Router} from "express";
import authenticate from "../middleware/auth.middleware.js";
import { getUserProfile, login, register } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authenticate, getUserProfile);

export default router;