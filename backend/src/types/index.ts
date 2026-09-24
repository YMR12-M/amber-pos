export type UserRole = "admin" | "cashier" | "kitchen";

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "paid"
  | "cancelled";

export type OrderItemStatus = "pending" | "preparing" | "ready" | "served";
export type OrderType = "dine_in" | "takeaway" | "delivery";
export type TableStatus = "free" | "occupied" | "reserved";
export type PaymentMethod = "cash" | "card" | "other";

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "pending",
  "preparing",
  "ready",
  "served",
  "paid",
  "cancelled",
] as const;

export const ORDER_ITEM_STATUSES: readonly OrderItemStatus[] = [
  "pending",
  "preparing",
  "ready",
  "served",
] as const;

export const TABLE_STATUSES: readonly TableStatus[] = ["free", "occupied", "reserved"] as const;
export const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "card", "other"] as const;

/** Statuses that keep a table busy. Anything else releases it. */
export const CLOSED_ORDER_STATUSES: readonly OrderStatus[] = ["paid", "cancelled"] as const;

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload extends AuthUser {
  iat?: number;
  exp?: number;
}

export interface Category {
  id: number;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
  is_available: number;
}

export interface RestaurantTable {
  id: number;
  label: string;
  status: TableStatus;
  /** المؤرشفة بتختفي من الصالة بس صفّها باقي عشان الفواتير القديمة. */
  is_active: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  item_name: string;
  quantity: number;
  unit_price: string;
  notes: string | null;
  status: OrderItemStatus;
}

export interface Order {
  id: number;
  table_id: number | null;
  table_label: string | null;
  cashier_id: number;
  cashier_name: string | null;
  order_type: OrderType;
  status: OrderStatus;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  payment_method: PaymentMethod | null;
  created_at: string;
  paid_at: string | null;
  items: OrderItem[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}
