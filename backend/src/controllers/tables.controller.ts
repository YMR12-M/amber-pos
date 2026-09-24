import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../config/db";
import { AppError } from "../utils/AppError";
import { TABLE_STATUSES } from "../types";

/**
 * الطاولات النشطة بس افتراضياً.
 * الأدمن بيبعت `?include_archived=1` عشان يشوف المؤرشفة كمان.
 */
export async function listTables(req: Request, res: Response, next: NextFunction) {
  try {
    const includeArchived = req.query.include_archived === "1" && req.user?.role === "admin";

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, o.id AS active_order_id
       FROM restaurant_tables t
       LEFT JOIN orders o
         ON o.table_id = t.id AND o.status NOT IN ('paid', 'cancelled')
       ${includeArchived ? "" : "WHERE t.is_active = TRUE"}
       ORDER BY t.is_active DESC, t.id ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

const statusSchema = z.object({
  status: z.enum(TABLE_STATUSES as [string, ...string[]]),
});

export async function updateTableStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const { status } = statusSchema.parse(req.body);

    // Freeing a table with an open order would orphan that order.
    if (status === "free") {
      const [open] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM orders WHERE table_id = ? AND status NOT IN ('paid', 'cancelled') LIMIT 1",
        [id]
      );
      if (open.length > 0) {
        throw AppError.conflict(
          `الطاولة عليها طلب مفتوح (#${open[0].id}) — لازم يتدفع أو يتلغي الأول`
        );
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE restaurant_tables SET status = ? WHERE id = ?",
      [status, id]
    );
    if (result.affectedRows === 0) throw AppError.notFound("الطاولة غير موجودة");

    res.json({ message: "تم التحديث" });
  } catch (err) {
    next(err);
  }
}

/* ==========================================================================
   إدارة الطاولات — إضافة · إعادة تسمية · حذف/أرشفة.
   ========================================================================== */

const labelSchema = z.object({
  label: z.string().trim().min(1, "اسم الطاولة مطلوب").max(50),
});

/** أسماء الطاولات لازم تفضل مميزة — الكاشير بيختار بالاسم مش بالرقم. */
async function assertLabelFree(label: string, exceptId?: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM restaurant_tables WHERE label = ?${exceptId ? " AND id <> ?" : ""}`,
    exceptId ? [label, exceptId] : [label]
  );
  if (rows.length > 0) throw AppError.conflict("في طاولة بنفس الاسم");
}

export async function createTable(req: Request, res: Response, next: NextFunction) {
  try {
    const { label } = labelSchema.parse(req.body);
    await assertLabelFree(label);

    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO restaurant_tables (label) VALUES (?)",
      [label]
    );
    res.status(201).json({ id: result.insertId, label, status: "free", is_active: 1 });
  } catch (err) {
    next(err);
  }
}

export async function renameTable(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const { label } = labelSchema.parse(req.body);
    await assertLabelFree(label, id);

    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE restaurant_tables SET label = ? WHERE id = ?",
      [label, id]
    );
    if (result.affectedRows === 0) throw AppError.notFound("الطاولة غير موجودة");

    res.json({ message: "تم التحديث" });
  } catch (err) {
    next(err);
  }
}

/** إرجاع طاولة مؤرشفة للخدمة. */
export async function restoreTable(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE restaurant_tables SET is_active = TRUE, status = 'free' WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) throw AppError.notFound("الطاولة غير موجودة");

    res.json({ message: "رجعت الطاولة للخدمة" });
  } catch (err) {
    next(err);
  }
}

/**
 * الحذف بيشتغل على مرحلتين حسب تاريخ الطاولة:
 *
 *  - عليها طلب مفتوح  → يترفض. الطلب لازم يتقفل الأول.
 *  - عليها طلبات قديمة → **أرشفة**: بتختفي من شاشة الكاشير بس صفّها باقي،
 *    فالفواتير القديمة تفضل عارفة اسمها والتقارير تفضل صح.
 *  - عمرها ما اتباع عليها → حذف نهائي، مفيش حاجة تتكسر.
 */
export async function deleteTable(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    const [exists] = await pool.query<RowDataPacket[]>(
      "SELECT id, label FROM restaurant_tables WHERE id = ?",
      [id]
    );
    if (exists.length === 0) throw AppError.notFound("الطاولة غير موجودة");

    const [open] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM orders WHERE table_id = ? AND status NOT IN ('paid', 'cancelled') LIMIT 1",
      [id]
    );
    if (open.length > 0) {
      throw AppError.conflict(`الطاولة عليها طلب مفتوح (#${open[0].id}) — اقفله الأول`);
    }

    const [history] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM orders WHERE table_id = ?",
      [id]
    );

    if (Number(history[0].count) > 0) {
      await pool.query("UPDATE restaurant_tables SET is_active = FALSE WHERE id = ?", [id]);
      return res.json({
        message: "تمت أرشفة الطاولة — اتشالت من الصالة والفواتير القديمة محفوظة",
        archived: true,
      });
    }

    await pool.query("DELETE FROM restaurant_tables WHERE id = ?", [id]);
    res.json({ message: "تم حذف الطاولة", archived: false });
  } catch (err) {
    next(err);
  }
}
