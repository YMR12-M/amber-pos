import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../config/db";
import { AppError } from "../utils/AppError";

const BCRYPT_ROUNDS = 12;

export async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    // password_hash is never selected.
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(150),
  password: z.string().min(8, "كلمة المرور لازم تكون 8 حروف على الأقل").max(128),
  role: z.enum(["admin", "cashier", "kitchen"]),
});

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createUserSchema.parse(req.body);

    const [existing] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ?", [
      data.email,
    ]);
    if (existing.length > 0) throw AppError.conflict("البريد الإلكتروني مستخدم بالفعل");

    const hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [data.name, data.email, hash, data.role]
    );

    res.status(201).json({ id: result.insertId, name: data.name, email: data.email, role: data.role });
  } catch (err) {
    next(err);
  }
}

export async function toggleUserActive(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    if (id === req.user!.id) {
      throw AppError.badRequest("مينفعش توقف حسابك بنفسك");
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, role, is_active FROM users WHERE id = ?",
      [id]
    );
    const user = rows[0];
    if (!user) throw AppError.notFound("المستخدم غير موجود");

    // Never leave the system without a way in.
    if (user.role === "admin" && user.is_active) {
      const [admins] = await pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = TRUE"
      );
      if (Number(admins[0].count) <= 1) {
        throw AppError.badRequest("مينفعش توقف آخر حساب أدمن");
      }
    }

    // الإيقاف بيلغي الجلسات المفتوحة فوراً (`tokens_valid_from`) — من
    // غير كده الموظف الموقوف بيفضل شغّال بتوكنه لحد 8 ساعات.
    // التفعيل ما بيلغيش حاجة، فمفيش داعي نلمس الطابع وقتها.
    // ترتيب الأعمدة هنا مقصود: MySQL بيسند بالترتيب، والتعبير اللاحق
    // بيشوف القيمة الجديدة. فـ `tokens_valid_from` لازم تتحسب **قبل**
    // ما `is_active` تتقلب، عشان `IF` تشوف الحالة القديمة.
    await pool.query(
      `UPDATE users
       SET tokens_valid_from = IF(is_active, NOW(), tokens_valid_from),
           is_active = NOT is_active
       WHERE id = ?`,
      [id]
    );

    res.json({ message: "تم التحديث" });
  } catch (err) {
    next(err);
  }
}

const passwordSchema = z.object({
  password: z.string().min(8, "كلمة المرور لازم تكون 8 حروف على الأقل").max(128),
});

export async function resetUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const { password } = passwordSchema.parse(req.body);

    // تغيير كلمة المرور بيقفل أي جلسة مفتوحة بالكلمة القديمة — ده
    // المقصود أصلاً لما الأدمن بيغيّرها لحساب اتسرّب.
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE users SET password_hash = ?, tokens_valid_from = NOW() WHERE id = ?",
      [hash, id]
    );
    if (result.affectedRows === 0) throw AppError.notFound("المستخدم غير موجود");

    res.json({ message: "تم تغيير كلمة المرور" });
  } catch (err) {
    next(err);
  }
}
