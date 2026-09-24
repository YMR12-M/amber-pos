import { Router } from "express";
import {
  listUsers,
  createUser,
  toggleUserActive,
  resetUserPassword,
} from "../controllers/users.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id/toggle", toggleUserActive);
router.patch("/:id/password", resetUserPassword);

export default router;
