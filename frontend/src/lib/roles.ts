import type { OrderType, PaymentMethod, Role } from "../types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "صاحب المحل",
  cashier: "الكاشير",
  kitchen: "المطبخ",
};

/** الصفحة الافتراضية لكل دور بعد تسجيل الدخول. */
export const HOME_FOR_ROLE: Record<Role, string> = {
  admin: "/admin",
  cashier: "/pos",
  kitchen: "/kitchen",
};

export const ORDER_TYPES: OrderType[] = ["dine_in", "takeaway", "delivery"];
export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "other"];
