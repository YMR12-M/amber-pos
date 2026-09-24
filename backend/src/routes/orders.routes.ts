import { Router } from "express";
import {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  updateOrderItemStatus,
  payOrder,
  kitchenQueue,
  salesReport,
} from "../controllers/orders.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// Kitchen gets its own queue endpoint, which excludes money columns.
router.get("/kitchen-queue", requireRole("admin", "kitchen"), kitchenQueue);
router.get("/reports/sales", requireRole("admin"), salesReport);

router.post("/", requireRole("admin", "cashier"), createOrder);
// Financial data — kitchen staff must not see revenue.
router.get("/", requireRole("admin", "cashier"), listOrders);
router.get("/:id", requireRole("admin", "cashier"), getOrder);

router.post("/:id/pay", requireRole("admin", "cashier"), payOrder);
router.patch("/:id/status", requireRole("admin", "cashier", "kitchen"), updateOrderStatus);
router.patch("/:id/items/:itemId/status", requireRole("admin", "kitchen"), updateOrderItemStatus);

export default router;
