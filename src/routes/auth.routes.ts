import express from "express";
import {
  adminLogin,
  userRegister,
  userLogin,
  getProfile,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

// ================= USER =================
router.post("/user/register", userRegister);
router.post("/user/login", userLogin);

// ================= ADMIN =================
router.post("/admin/login", adminLogin);

// ================= COMMON =================
router.get("/profile", authenticate, getProfile);

export default router;
