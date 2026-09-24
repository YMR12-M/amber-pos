import type {
  Category,
  KitchenOrder,
  MenuItem,
  NewOrderPayload,
  Order,
  OrderItemStatus,
  OrderStatus,
  Paginated,
  PaymentMethod,
  PublicSettings,
  RestaurantTable,
  Role,
  SalesReport,
  Settings,
  TableStatus,
  User,
} from "./types";

const BASE_URL = "/api";

/** Raised on 401 so the app can drop the session instead of showing a dead UI. */
export class UnauthorizedError extends Error {
  constructor() {
    super("الجلسة منتهية، سجل دخول تاني");
    this.name = "UnauthorizedError";
  }
}

type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler = () => {};

export function setSessionExpiredHandler(handler: SessionExpiredHandler) {
  onSessionExpired = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    // The token lives in an httpOnly cookie, so it must ride along explicitly.
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    onSessionExpired();
    throw new UnauthorizedError();
  }

  const data = await res.json().catch(() => ({}) as Record<string, unknown>);

  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? "حصل خطأ، حاول تاني");
  }

  return data as T;
}

const body = (value: unknown) => (value === undefined ? undefined : JSON.stringify(value));

const post = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "POST", body: body(data) });
const patch = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "PATCH", body: body(data) });
const put = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "PUT", body: body(data) });
const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

interface Ok {
  message: string;
}

export const api = {
  // --- auth ---
  login: (email: string, password: string) =>
    post<{ user: User }>("/auth/login", { email, password }),
  logout: () => post<Ok>("/auth/logout"),
  me: () => request<{ user: User }>("/auth/me"),

  // --- settings ---
  getSettings: () => request<Settings>("/settings"),
  getPublicSettings: () => request<PublicSettings>("/settings/public"),
  saveSettings: (data: Settings) => put<{ message: string; settings: Settings }>("/settings", data),

  // --- categories ---
  getCategories: () => request<Category[]>("/menu/categories"),
  createCategory: (data: { name: string; sort_order?: number }) =>
    post<Category>("/menu/categories", data),
  updateCategory: (id: number, data: { name?: string; sort_order?: number }) =>
    put<Ok>(`/menu/categories/${id}`, data),
  deleteCategory: (id: number) => del<Ok>(`/menu/categories/${id}`),

  // --- menu ---
  getMenuItems: (categoryId?: number) =>
    request<MenuItem[]>(`/menu/items${categoryId ? `?category_id=${categoryId}` : ""}`),
  createMenuItem: (data: {
    category_id: number;
    name: string;
    price: number;
    description?: string | null;
  }) => post<MenuItem>("/menu/items", data),
  updateMenuItem: (
    id: number,
    data: Partial<{ name: string; price: number; category_id: number; description: string | null }>
  ) => put<Ok>(`/menu/items/${id}`, data),
  deleteMenuItem: (id: number) => del<Ok>(`/menu/items/${id}`),
  toggleMenuItem: (id: number) => patch<Ok>(`/menu/items/${id}/toggle`),

  // --- tables ---
  getTables: (includeArchived = false) =>
    request<RestaurantTable[]>(`/tables${includeArchived ? "?include_archived=1" : ""}`),
  updateTableStatus: (id: number, status: TableStatus) =>
    patch<Ok>(`/tables/${id}/status`, { status }),
  createTable: (label: string) => post<RestaurantTable>("/tables", { label }),
  renameTable: (id: number, label: string) => patch<Ok>(`/tables/${id}`, { label }),
  restoreTable: (id: number) => patch<Ok>(`/tables/${id}/restore`),
  deleteTable: (id: number) => del<{ message: string; archived: boolean }>(`/tables/${id}`),

  // --- orders ---
  createOrder: (data: NewOrderPayload) =>
    post<{ id: number; subtotal: number; discount: number; tax: number; total: number }>(
      "/orders",
      data
    ),
  getOrders: (
    params: { status?: OrderStatus | OrderStatus[]; page?: number; page_size?: number } = {}
  ) => {
    const query = new URLSearchParams();
    // حالة واحدة أو كذا حالة في نداء واحد — السيرفر بيفهم الفاصلة.
    const statuses = params.status
      ? Array.isArray(params.status)
        ? params.status
        : [params.status]
      : [];
    if (statuses.length) query.set("status", statuses.join(","));
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    return request<Paginated<Order>>(`/orders${qs ? `?${qs}` : ""}`);
  },
  getOrder: (id: number) => request<Order>(`/orders/${id}`),
  payOrder: (id: number, payment_method: PaymentMethod) =>
    post<{ message: string; order_id: number; total: number; payment_method: PaymentMethod }>(
      `/orders/${id}/pay`,
      { payment_method }
    ),
  updateOrderStatus: (id: number, status: OrderStatus) =>
    patch<Ok>(`/orders/${id}/status`, { status }),
  updateOrderItemStatus: (orderId: number, itemId: number, status: OrderItemStatus) =>
    patch<Ok>(`/orders/${orderId}/items/${itemId}/status`, { status }),
  getKitchenQueue: () => request<KitchenOrder[]>("/orders/kitchen-queue"),
  getSalesReport: (days = 7) => request<SalesReport>(`/orders/reports/sales?days=${days}`),

  // --- staff ---
  getUsers: () => request<User[]>("/users"),
  createUser: (data: { name: string; email: string; password: string; role: Role }) =>
    post<User>("/users", data),
  toggleUser: (id: number) => patch<Ok>(`/users/${id}/toggle`),
  resetUserPassword: (id: number, password: string) =>
    patch<Ok>(`/users/${id}/password`, { password }),
};
