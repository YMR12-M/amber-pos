import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../config/db";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { toPiastres, toEgp, applyRate } from "../utils/money";
import { getSettings } from "../services/settings.service";
import {
  ORDER_STATUSES,
  ORDER_ITEM_STATUSES,
  PAYMENT_METHODS,
  CLOSED_ORDER_STATUSES,
  OrderStatus,
} from "../types";

const orderItemSchema = z.object({
  menu_item_id: z.number().int().positive(),
  quantity: z.number().int().positive().max(999),
  notes: z.string().max(255).optional().nullable(),
});

const createOrderSchema = z
  .object({
    table_id: z.number().int().positive().optional().nullable(),
    order_type: z.enum(["dine_in", "takeaway", "delivery"]).default("dine_in"),
    items: z.array(orderItemSchema).min(1).max(100),
    discount: z.number().nonnegative().default(0),
  })
  .refine((d) => d.order_type !== "dine_in" || d.table_id != null, {
    message: "لازم تختار طاولة لطلبات الصالة",
    path: ["table_id"],
  });

/**
 * Creates an order inside one transaction:
 *  - prices are read from the DB, never trusted from the client
 *  - the tax rate comes from the saved settings, not from the request
 *  - the table row is locked so two cashiers can't claim the same table
 *  - totals are computed in integer piastres, so no float drift
 */
export async function createOrder(req: Request, res: Response, next: NextFunction) {
  const conn = await pool.getConnection();
  try {
    const data = createOrderSchema.parse(req.body);
    const cashierId = req.user!.id;

    await conn.beginTransaction();

    // Lock the table first so a concurrent order can't pass the same check.
    if (data.table_id != null) {
      const [tableRows] = await conn.query<RowDataPacket[]>(
        "SELECT id, label, status, is_active FROM restaurant_tables WHERE id = ? FOR UPDATE",
        [data.table_id]
      );
      const table = tableRows[0];
      if (!table) throw AppError.notFound("الطاولة غير موجودة");
      if (!table.is_active) throw AppError.conflict(`${table.label} مؤرشفة ومش في الخدمة`);
      if (table.status !== "free") {
        throw AppError.conflict(`${table.label} مش متاحة حالياً`);
      }
    }

    const itemIds = [...new Set(data.items.map((i) => i.menu_item_id))];
    const [menuRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, name, price, is_available FROM menu_items WHERE id IN (${itemIds
        .map(() => "?")
        .join(",")})`,
      itemIds
    );
    const menuById = new Map(menuRows.map((r) => [r.id, r]));

    for (const item of data.items) {
      const menuItem = menuById.get(item.menu_item_id);
      if (!menuItem) throw AppError.badRequest(`الصنف رقم ${item.menu_item_id} غير موجود`);
      if (!menuItem.is_available) throw AppError.conflict(`${menuItem.name} غير متاح حالياً`);
    }

    // --- money: integer piastres throughout ---
    const subtotalP = data.items.reduce((sum, item) => {
      const menuItem = menuById.get(item.menu_item_id)!;
      return sum + toPiastres(menuItem.price) * item.quantity;
    }, 0);

    const discountP = toPiastres(data.discount);
    if (discountP > subtotalP) {
      throw AppError.badRequest(
        `الخصم (${toEgp(discountP)}) أكبر من إجمالي الطلب (${toEgp(subtotalP)})`
      );
    }

    // نسبة الضريبة من الإعدادات المحفوظة — الكلاينت ما بيبعتهاش، فمستحيل
    // كاشير يغيّرها من الشاشة. `maxTaxRate` سقف تاني من `.env`.
    const { tax_rate: configuredRate } = await getSettings();
    const taxRate = Math.min(Math.max(configuredRate, 0), env.maxTaxRate);

    const taxableP = subtotalP - discountP;
    const taxP = applyRate(taxableP, taxRate);
    const totalP = taxableP + taxP;

    const [orderResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO orders (table_id, cashier_id, order_type, status, subtotal, discount, tax, total)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [
        data.table_id ?? null,
        cashierId,
        data.order_type,
        toEgp(subtotalP),
        toEgp(discountP),
        toEgp(taxP),
        toEgp(totalP),
      ]
    );
    const orderId = orderResult.insertId;

    const itemValues = data.items.map((item) => [
      orderId,
      item.menu_item_id,
      item.quantity,
      toEgp(toPiastres(menuById.get(item.menu_item_id)!.price)),
      item.notes ?? null,
    ]);
    await conn.query(
      `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes, status)
       VALUES ${itemValues.map(() => "(?, ?, ?, ?, ?, 'pending')").join(", ")}`,
      itemValues.flat()
    );

    if (data.table_id != null) {
      await conn.query("UPDATE restaurant_tables SET status = 'occupied' WHERE id = ?", [
        data.table_id,
      ]);
    }

    await conn.commit();

    res.status(201).json({
      id: orderId,
      subtotal: toEgp(subtotalP),
      discount: toEgp(discountP),
      tax: toEgp(taxP),
      total: toEgp(totalP),
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

/**
 * `status` بيقبل حالة واحدة أو أكتر مفصولين بفاصلة:
 *   ?status=pending,preparing,ready,served
 *
 * شاشة الكاشير محتاجة الطلبات المفتوحة كلها. قبل كده كانت بتعمل نداء
 * لكل حالة (4 نداءات كل 8 ثواني لكل تابلت) — تابلت واحد كان بياكل
 * 37 طلب في الدقيقة من سقف الـ rate limit.
 */
const listQuerySchema = z.object({
  status: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : []
    )
    .pipe(z.array(z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]])).max(6)),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(env.maxPageSize).default(env.defaultPageSize),
});

/** Attaches items to a set of orders with one extra query (no N+1). */
async function attachItems<T extends RowDataPacket>(orders: T[]) {
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const [items] = await pool.query<RowDataPacket[]>(
    `SELECT oi.*, mi.name AS item_name
     FROM order_items oi
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE oi.order_id IN (${orderIds.map(() => "?").join(",")})
     ORDER BY oi.id ASC`,
    orderIds
  );

  const byOrder = new Map<number, RowDataPacket[]>();
  for (const item of items) {
    const list = byOrder.get(item.order_id);
    if (list) list.push(item);
    else byOrder.set(item.order_id, [item]);
  }

  return orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
}

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page, page_size } = listQuerySchema.parse(req.query);
    const where = status.length ? `WHERE o.status IN (${status.map(() => "?").join(",")})` : "";
    const whereParams = status;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM orders o ${where}`,
      whereParams
    );
    const total = Number(countRows[0].total);

    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT o.*, t.label AS table_label, u.name AS cashier_name
       FROM orders o
       LEFT JOIN restaurant_tables t ON t.id = o.table_id
       LEFT JOIN users u ON u.id = o.cashier_id
       ${where}
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, page_size, (page - 1) * page_size]
    );

    res.json({
      data: await attachItems(orders),
      page,
      page_size,
      total,
      total_pages: Math.ceil(total / page_size),
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT o.*, t.label AS table_label, u.name AS cashier_name
       FROM orders o
       LEFT JOIN restaurant_tables t ON t.id = o.table_id
       LEFT JOIN users u ON u.id = o.cashier_id
       WHERE o.id = ?`,
      [id]
    );
    if (orders.length === 0) throw AppError.notFound("الطلب غير موجود");

    const [withItems] = await attachItems(orders);
    res.json(withItems);
  } catch (err) {
    next(err);
  }
}

/** Item statuses that follow from an order-level status change. */
const CASCADE_ITEM_STATUS: Partial<Record<OrderStatus, string>> = {
  preparing: "preparing",
  ready: "ready",
  served: "served",
};

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]),
});

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  const conn = await pool.getConnection();
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const { status } = statusSchema.parse(req.body);

    if (status === "paid") {
      throw AppError.badRequest("استخدم POST /orders/:id/pay لتسجيل الدفع");
    }

    await conn.beginTransaction();

    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id, status, table_id FROM orders WHERE id = ? FOR UPDATE",
      [id]
    );
    const order = rows[0];
    if (!order) throw AppError.notFound("الطلب غير موجود");
    if (CLOSED_ORDER_STATUSES.includes(order.status)) {
      throw AppError.conflict(`الطلب مقفول بالفعل (${order.status}) ومش ممكن يتعدل`);
    }

    await conn.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);

    // Keep item statuses consistent with the order they belong to.
    const itemStatus = CASCADE_ITEM_STATUS[status];
    if (itemStatus) {
      await conn.query("UPDATE order_items SET status = ? WHERE order_id = ?", [itemStatus, id]);
    }

    if (status === "cancelled" && order.table_id) {
      await conn.query("UPDATE restaurant_tables SET status = 'free' WHERE id = ?", [
        order.table_id,
      ]);
    }

    await conn.commit();
    res.json({ message: "تم تحديث حالة الطلب" });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

const paySchema = z.object({
  payment_method: z.enum(PAYMENT_METHODS as [string, ...string[]]),
});

/**
 * Closes the money loop: marks the order paid, stamps the payment method and
 * time, and releases the table. This is what makes sales reports non-empty.
 */
export async function payOrder(req: Request, res: Response, next: NextFunction) {
  const conn = await pool.getConnection();
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const { payment_method } = paySchema.parse(req.body);

    await conn.beginTransaction();

    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id, status, table_id, total FROM orders WHERE id = ? FOR UPDATE",
      [id]
    );
    const order = rows[0];
    if (!order) throw AppError.notFound("الطلب غير موجود");
    if (order.status === "paid") throw AppError.conflict("الطلب مدفوع بالفعل");
    if (order.status === "cancelled") throw AppError.conflict("الطلب ملغي ومش ممكن يتدفع");

    await conn.query(
      "UPDATE orders SET status = 'paid', payment_method = ?, paid_at = NOW() WHERE id = ?",
      [payment_method, id]
    );
    await conn.query("UPDATE order_items SET status = 'served' WHERE order_id = ?", [id]);

    if (order.table_id) {
      await conn.query("UPDATE restaurant_tables SET status = 'free' WHERE id = ?", [
        order.table_id,
      ]);
    }

    await conn.commit();
    res.json({
      message: "تم تسجيل الدفع",
      order_id: id,
      total: Number(order.total),
      payment_method,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

const itemStatusSchema = z.object({
  status: z.enum(ORDER_ITEM_STATUSES as [string, ...string[]]),
});

export async function updateOrderItemStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = z.coerce.number().int().positive().parse(req.params.id);
    const itemId = z.coerce.number().int().positive().parse(req.params.itemId);
    const { status } = itemStatusSchema.parse(req.body);

    // نفس قاعدة `updateOrderStatus`: الطلب المقفول مينفعش يتعدل.
    // من غير الفحص ده كان ينفع ترجّع صنف في فاتورة **مدفوعة** لـ
    // "قيد الانتظار" — الورق بيقول اتقدّم والقاعدة بتقول لأ.
    const [orders] = await pool.query<RowDataPacket[]>(
      "SELECT status FROM orders WHERE id = ?",
      [orderId]
    );
    const order = orders[0];
    if (!order) throw AppError.notFound("الطلب غير موجود");
    if (CLOSED_ORDER_STATUSES.includes(order.status)) {
      throw AppError.conflict(`الطلب مقفول بالفعل (${order.status}) ومش ممكن يتعدل`);
    }

    // Scope by order_id too, so an item id from another order can't be touched.
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE order_items SET status = ? WHERE id = ? AND order_id = ?",
      [status, itemId, orderId]
    );
    if (result.affectedRows === 0) throw AppError.notFound("الصنف غير موجود في الطلب ده");

    res.json({ message: "تم تحديث حالة الصنف" });
  } catch (err) {
    next(err);
  }
}

export async function kitchenQueue(_req: Request, res: Response, next: NextFunction) {
  try {
    // Deliberately excludes money columns — kitchen staff don't need revenue.
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT o.id, o.order_type, o.status, o.created_at, t.label AS table_label
       FROM orders o
       LEFT JOIN restaurant_tables t ON t.id = o.table_id
       WHERE o.status IN ('pending', 'preparing', 'ready')
       ORDER BY o.created_at ASC
       LIMIT ?`,
      [env.maxPageSize]
    );

    res.json(await attachItems(orders));
  } catch (err) {
    next(err);
  }
}

/**
 * فرق توقيت السيرفر عن UTC بصيغة "+03:00".
 *
 * التواريخ متخزّنة UTC (شوف `config/db`)، بس "يوم مبيعات" بالنسبة لصاحب
 * المحل هو اليوم المحلي عنده مش يوم UTC — من غير التحويل ده، بيع الساعة
 * 1 بالليل في مصر كان هيتحسب على اليوم اللي فات.
 */
function serverUtcOffset(): string {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

/** بداية اليوم المحلي من `days` يوم فاتوا، كنص UTC للمقارنة في SQL. */
function windowStartUtc(days: number): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  return start.toISOString().slice(0, 19).replace("T", " ");
}

export async function salesReport(req: Request, res: Response, next: NextFunction) {
  try {
    const days = z.coerce.number().int().positive().max(365).default(7).parse(req.query.days ?? 7);
    const offset = serverUtcOffset();
    const since = windowStartUtc(days);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(CONVERT_TZ(paid_at, '+00:00', ?)) AS day,
              COUNT(*) AS orders_count,
              SUM(total) AS total_sales,
              SUM(discount) AS total_discount
       FROM orders
       WHERE status = 'paid' AND paid_at >= ?
       GROUP BY day
       ORDER BY day ASC`,
      [offset, since]
    );

    const [byMethod] = await pool.query<RowDataPacket[]>(
      `SELECT payment_method, COUNT(*) AS orders_count, SUM(total) AS total_sales
       FROM orders
       WHERE status = 'paid' AND paid_at >= ?
       GROUP BY payment_method`,
      [since]
    );

    res.json({ daily: rows, by_payment_method: byMethod });
  } catch (err) {
    next(err);
  }
}
