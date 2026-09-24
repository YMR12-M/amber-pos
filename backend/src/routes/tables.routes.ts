import { Router } from "express";
import {
  listTables,
  updateTableStatus,
  createTable,
  renameTable,
  restoreTable,
  deleteTable,
} from "../controllers/tables.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const adminOnly = [requireAuth, requireRole("admin")] as const;

router.get("/", requireAuth, listTables);
router.patch("/:id/status", requireAuth, requireRole("admin", "cashier"), updateTableStatus);

router.post("/", ...adminOnly, createTable);
router.patch("/:id", ...adminOnly, renameTable);
router.patch("/:id/restore", ...adminOnly, restoreTable);
router.delete("/:id", ...adminOnly, deleteTable);

export default router;
