import { RowDataPacket } from "mysql2";
import { pool } from "../config/db";

/**
 * إعدادات المنشأة — مصدر واحد للقراءة في السيرفر كله.
 *
 * الصف واحد (id = 1) وبيتقري كتير جداً (كل طلب بيحتاج نسبة الضريبة)،
 * فبنخزّنه في الذاكرة لمدة قصيرة. التعديل بيمسح الكاش فوراً، والمهلة
 * القصيرة بتخلي أي نسخة تانية من السيرفر (أكتر من عملية/حاوية) تلحق
 * التغيير من غير ما نحتاج طبقة رسايل بينهم.
 */
export interface Settings {
  merchant_name: string;
  branch: string;
  address: string;
  phone: string;
  tax_id: string;
  station: string;
  currency: string;
  /** نسبة عشرية: 0.14 = 14% */
  tax_rate: number;
  receipt_footer: string;
}

export const DEFAULT_SETTINGS: Settings = {
  merchant_name: "",
  branch: "",
  address: "",
  phone: "",
  tax_id: "",
  station: "POS-01",
  currency: "ج.م",
  tax_rate: 0,
  receipt_footer: "",
};

const CACHE_TTL_MS = 10_000;

let cached: Settings | null = null;
let cachedAt = 0;

function normalize(row: RowDataPacket | undefined): Settings {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    merchant_name: row.merchant_name ?? "",
    branch: row.branch ?? "",
    address: row.address ?? "",
    phone: row.phone ?? "",
    tax_id: row.tax_id ?? "",
    station: row.station || DEFAULT_SETTINGS.station,
    currency: row.currency || DEFAULT_SETTINGS.currency,
    tax_rate: Number(row.tax_rate) || 0,
    receipt_footer: row.receipt_footer ?? "",
  };
}

export async function getSettings(): Promise<Settings> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT merchant_name, branch, address, phone, tax_id, station,
            currency, tax_rate, receipt_footer
     FROM settings WHERE id = 1`
  );

  cached = normalize(rows[0]);
  cachedAt = Date.now();
  return cached;
}

/** بيتنده بعد أي تعديل — القراءة الجاية بتروح للقاعدة. */
export function invalidateSettingsCache() {
  cached = null;
  cachedAt = 0;
}
