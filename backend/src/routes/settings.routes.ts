import { Router } from "express";
import {
  getAllSettings,
  getPublicSettings,
  updateSettings,
} from "../controllers/settings.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// اسم المحل على شاشة الدخول — قبل أي توكن.
router.get("/public", getPublicSettings);
router.get("/", requireAuth, getAllSettings);
router.put("/", requireAuth, requireRole("admin"), updateSettings);

export default router;
