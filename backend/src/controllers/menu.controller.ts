import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { AppError } from "../utils/AppError";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export async function listCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM categories ORDER BY sort_order ASC, id ASC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function listMenuItems(req: Request, res: Response, next: NextFunction) {
  try {
    const { category_id } = req.query;
    let sql = "SELECT * FROM menu_items";
    const params: unknown[] = [];
    if (category_id) {
      sql += " WHERE category_id = ?";
      params.push(category_id);
    }
    sql += " ORDER BY id ASC";
    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

const menuItemSchema = z.object({
  category_id: z.number().int().positive(),
  name: z.string().trim().min(1, "اسم الصنف مطلوب").max(150),
  description: z.string().trim().max(500).optional().nullable(),
  price: z.number().positive("السعر لازم يكون أكبر من صفر").max(999999),
  image_url: z.string().url().max(500).optional().nullable(),
});

/** القسم لازم يكون موجود — من غير الفحص ده بيرجع خطأ FK خام مش مفهوم. */
async function assertCategoryExists(categoryId: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM categories WHERE id = ?", [
    categoryId,
  ]);
  if (rows.length === 0) throw AppError.badRequest("القسم غير موجود");
}

export async function createMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const data = menuItemSchema.parse(req.body);
    await assertCategoryExists(data.category_id);

    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO menu_items (category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?)",
      [data.category_id, data.name, data.description ?? null, data.price, data.image_url ?? null]
    );
    res.status(201).json({ id: result.insertId, ...data });
  } catch (err) {
    next(err);
  }
}

export async function updateMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const data = menuItemSchema.partial().parse(req.body);
    const fields = Object.keys(data);
    if (fields.length === 0) throw AppError.badRequest("مفيش بيانات للتعديل");

    if (data.category_id) await assertCategoryExists(data.category_id);

    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => (data as Record<string, unknown>)[f]);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE menu_items SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    if (result.affectedRows === 0) throw AppError.notFound("الصنف غير موجود");

    res.json({ message: "تم التحديث" });
  } catch (err) {
    next(err);
  }
}

/**
 * الصنف اللي اتباع قبل كده **مش** بيتحذف.
 *
 * `order_items` بتشاور عليه، فحذفه يمسح الصنف من فواتير قديمة ويخلي
 * تقرير المبيعات يكدب. البديل اللي بيعمل نفس الغرض من غير ضرر:
 * "إيقاف" — بيختفي من شاشة الكاشير والتاريخ بيفضل سليم.
 */
export async function deleteMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    const [used] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM order_items WHERE menu_item_id = ? LIMIT 1",
      [id]
    );
    if (Number(used[0].count) > 0) {
      throw AppError.conflict(
        "الصنف ده مسجّل في طلبات سابقة — استخدم \"إيقاف\" بدل الحذف عشان التقارير تفضل صح"
      );
    }

    const [result] = await pool.query<ResultSetHeader>("DELETE FROM menu_items WHERE id = ?", [id]);
    if (result.affectedRows === 0) throw AppError.notFound("الصنف غير موجود");

    res.json({ message: "تم الحذف" });
  } catch (err) {
    next(err);
  }
}

export async function toggleAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE menu_items SET is_available = NOT is_available WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) throw AppError.notFound("الصنف غير موجود");

    res.json({ message: "تم التحديث" });
  } catch (err) {
    next(err);
  }
}

/* ==========================================================================
   الأقسام — CRUD كامل.
   من غير الأقسام دي مفيش منيو أصلاً، فالأدمن لازم يقدر يعملها من الشاشة
   مش من قاعدة البيانات.
   ========================================================================== */

const categorySchema = z.object({
  name: z.string().trim().min(1, "اسم القسم مطلوب").max(100),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = categorySchema.parse(req.body);

    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM categories WHERE name = ?",
      [data.name]
    );
    if (existing.length > 0) throw AppError.conflict("في قسم بنفس الاسم");

    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO categories (name, sort_order) VALUES (?, ?)",
      [data.name, data.sort_order]
    );
    res.status(201).json({ id: result.insertId, ...data });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const data = categorySchema.partial().parse(req.body);
    const fields = Object.keys(data);
    if (fields.length === 0) throw AppError.badRequest("مفيش بيانات للتعديل");

    if (data.name) {
      const [clash] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM categories WHERE name = ? AND id <> ?",
        [data.name, id]
      );
      if (clash.length > 0) throw AppError.conflict("في قسم تاني بنفس الاسم");
    }

    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => (data as Record<string, unknown>)[f]);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE categories SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    if (result.affectedRows === 0) throw AppError.notFound("القسم غير موجود");

    res.json({ message: "تم التحديث" });
  } catch (err) {
    next(err);
  }
}

/**
 * الحذف بيترفض لو القسم فيه أصناف.
 *
 * المخطط القديم كان `ON DELETE CASCADE`، يعني حذف قسم كان ممكن يمسح
 * أصناف مرتبطة بفواتير قديمة ويكسر تاريخ المبيعات. بنخلي الأدمن ينقل
 * أو يمسح الأصناف الأول — قرار واضح بدل حذف صامت.
 */
export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    const [items] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM menu_items WHERE category_id = ?",
      [id]
    );
    const count = Number(items[0].count);
    if (count > 0) {
      throw AppError.conflict(`القسم فيه ${count} صنف — احذفهم أو انقلهم لقسم تاني الأول`);
    }

    const [result] = await pool.query<ResultSetHeader>("DELETE FROM categories WHERE id = ?", [id]);
    if (result.affectedRows === 0) throw AppError.notFound("القسم غير موجود");

    res.json({ message: "تم الحذف" });
  } catch (err) {
    next(err);
  }
}
