import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { env } from "../config/env";
import { getSettings, invalidateSettingsCache } from "../services/settings.service";

/**
 * البيانات اللي شاشة الدخول محتاجاها **قبل** أي توكن: اسم المحل والفرع
 * والمحطة. ده بيطمّن الموظف إنه على الجهاز الصح قبل ما يكتب باسورد —
 * ومفيش فيه أي بيانات حساسة (مفيش رقم ضريبي ولا تليفون ولا نسب).
 */
export async function getPublicSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const s = await getSettings();
    res.json({
      merchant_name: s.merchant_name,
      branch: s.branch,
      station: s.station,
      currency: s.currency,
    });
  } catch (err) {
    next(err);
  }
}

/** الإعدادات الكاملة — لأي مستخدم مسجّل (الفاتورة محتاجاها). */
export async function getAllSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await getSettings());
  } catch (err) {
    next(err);
  }
}

const settingsSchema = z.object({
  merchant_name: z.string().trim().min(1, "اسم المحل مطلوب").max(120),
  branch: z.string().trim().max(120).default(""),
  address: z.string().trim().max(200).default(""),
  phone: z.string().trim().max(40).default(""),
  tax_id: z.string().trim().max(40).default(""),
  station: z.string().trim().min(1, "اسم المحطة مطلوب").max(20),
  currency: z.string().trim().min(1, "رمز العملة مطلوب").max(10),
  tax_rate: z
    .number()
    .nonnegative()
    .max(env.maxTaxRate, `نسبة الضريبة مينفعش تزيد عن ${Math.round(env.maxTaxRate * 100)}%`),
  receipt_footer: z.string().trim().max(200).default(""),
});

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = settingsSchema.parse(req.body);

    await pool.query(
      `UPDATE settings SET
         merchant_name = ?, branch = ?, address = ?, phone = ?, tax_id = ?,
         station = ?, currency = ?, tax_rate = ?, receipt_footer = ?
       WHERE id = 1`,
      [
        data.merchant_name,
        data.branch,
        data.address,
        data.phone,
        data.tax_id,
        data.station,
        data.currency,
        data.tax_rate,
        data.receipt_footer,
      ]
    );

    invalidateSettingsCache();
    res.json({ message: "تم حفظ الإعدادات", settings: await getSettings() });
  } catch (err) {
    next(err);
  }
}
