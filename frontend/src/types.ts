export type Role = "admin" | "cashier" | "kitchen";

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

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: number;
  created_at?: string;
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
  /** 0 = مؤرشفة: مش بتظهر في الصالة، بس الفواتير القديمة لسه عارفة اسمها. */
  is_active: number;
  active_order_id: number | null;
}

/**
 * بيانات المنشأة — بتتحفظ في قاعدة البيانات وبتتظبط من
 * **لوحة التحكم ← الإعدادات**. دي اللي بتتطبع على الفاتورة.
 */
export interface Settings {
  merchant_name: string;
  branch: string;
  address: string;
  phone: string;
  tax_id: string;
  station: string;
  currency: string;
  /** نسبة عشرية: 0.14 = 14%. السيرفر هو اللي بيطبّقها على كل طلب. */
  tax_rate: number;
  receipt_footer: string;
}

/** الجزء المسموح عرضه قبل تسجيل الدخول — اسم المحل بس، مفيش أرقام حساسة. */
export interface PublicSettings {
  merchant_name: string;
  branch: string;
  station: string;
  currency: string;
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

/** Kitchen queue deliberately carries no money fields. */
export interface KitchenOrder {
  id: number;
  order_type: OrderType;
  status: OrderStatus;
  table_label: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface SalesDay {
  day: string;
  orders_count: number;
  total_sales: string;
  total_discount: string;
}

export interface SalesByMethod {
  payment_method: PaymentMethod;
  orders_count: number;
  total_sales: string;
}

export interface SalesReport {
  daily: SalesDay[];
  by_payment_method: SalesByMethod[];
}

/** الضريبة مش هنا عن قصد — السيرفر بياخدها من الإعدادات المحفوظة. */
export interface NewOrderPayload {
  table_id?: number | null;
  order_type: OrderType;
  items: { menu_item_id: number; quantity: number; notes?: string | null }[];
  discount?: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "قيد الانتظار",
  preparing: "جاري التحضير",
  ready: "جاهز",
  served: "تم التقديم",
  paid: "مدفوع",
  cancelled: "ملغي",
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: "صالة",
  takeaway: "تيك أواي",
  delivery: "توصيل",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "كاش",
  card: "بطاقة",
  other: "أخرى",
};

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  free: "متاحة",
  occupied: "مشغولة",
  reserved: "محجوزة",
};
