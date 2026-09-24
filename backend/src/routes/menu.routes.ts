import { Router } from "express";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
} from "../controllers/menu.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const adminOnly = [requireAuth, requireRole("admin")] as const;

// --- الأقسام ---
router.get("/categories", requireAuth, listCategories);
router.post("/categories", ...adminOnly, createCategory);
router.put("/categories/:id", ...adminOnly, updateCategory);
router.delete("/categories/:id", ...adminOnly, deleteCategory);

// --- الأصناف ---
router.get("/items", requireAuth, listMenuItems);
router.post("/items", ...adminOnly, createMenuItem);
router.put("/items/:id", ...adminOnly, updateMenuItem);
router.delete("/items/:id", ...adminOnly, deleteMenuItem);
router.patch("/items/:id/toggle", ...adminOnly, toggleAvailability);

export default router;
