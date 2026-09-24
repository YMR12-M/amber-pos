import crypto from "node:crypto";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../app";
import { pool } from "../config/db";
import { invalidateSettingsCache } from "../services/settings.service";

export const app = createApp();

/**
 * الاختبارات بتجهّز بياناتها بنفسها.
 *
 * مفيش داتا تجريبية في النظام، فكل ملف اختبار بيعمل حساباته وأصنافه
 * وطاولاته وبيمسحهم وراه — ومش بيلمس بيانات شغل حقيقية في نفس القاعدة.
 *
 * كل عملية ليها بادئة خاصة بيها (`NS`) عشان تشغيل الملفات بالتوازي
 * ما يخليش ملف يمسح بيانات ملف تاني.
 */
const NS = `t${process.pid}${crypto.randomBytes(3).toString("hex")}`;

/** باسورد عشوائي لكل تشغيلة — مفيش كلمة مرور ثابتة مكتوبة في الريبو. */
const PASSWORD = `Tst-${crypto.randomBytes(9).toString("base64url")}1`;

export const CREDENTIALS = {
  admin: { email: `${NS}.admin@amber-pos.test`, password: PASSWORD },
  cashier: { email: `${NS}.cashier@amber-pos.test`, password: PASSWORD },
  kitchen: { email: `${NS}.kitchen@amber-pos.test`, password: PASSWORD },
};

export interface Fixtures {
  categoryId: number;
  /** صنف سعره 10.00 — الأساس لكل الحسابات المتوقّعة في الاختبارات. */
  itemId: number;
  itemPrice: number;
  tableIds: number[];
}

let fixtures: Fixtures | null = null;
const extraItemIds: number[] = [];
const orderIds: number[] = [];

export const ITEM_PRICE = 10;
const TABLE_COUNT = 3;

/** بيتنده من `before()` في كل ملف اختبار. */
export async function setupFixtures(): Promise<Fixtures> {
  if (fixtures) return fixtures;

  const hash = await bcrypt.hash(PASSWORD, 10);
  for (const [role, creds] of Object.entries(CREDENTIALS)) {
    await pool.query("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)", [
      `${NS} ${role}`,
      creds.email,
      hash,
      role,
    ]);
  }

  const [category] = await pool.query<any>(
    "INSERT INTO categories (name, sort_order) VALUES (?, 999)",
    [`${NS} category`]
  );
  const categoryId = category.insertId;

  const itemId = await insertMenuItem(`${NS} item`, ITEM_PRICE, categoryId);

  const tableIds: number[] = [];
  for (let i = 1; i <= TABLE_COUNT; i++) {
    const [table] = await pool.query<any>("INSERT INTO restaurant_tables (label) VALUES (?)", [
      `${NS} table ${i}`,
    ]);
    tableIds.push(table.insertId);
  }

  // الضريبة من الإعدادات، فالاختبارات بتبدأ من صفر معلوم.
  await setTaxRate(0);

  fixtures = { categoryId, itemId, itemPrice: ITEM_PRICE, tableIds };
  return fixtures;
}

export async function insertMenuItem(name: string, price: number, categoryId?: number) {
  const id = categoryId ?? fixtures!.categoryId;
  const [res] = await pool.query<any>(
    "INSERT INTO menu_items (category_id, name, price) VALUES (?, ?, ?)",
    [id, name, price]
  );
  if (categoryId === undefined) extraItemIds.push(res.insertId);
  return res.insertId as number;
}

/**
 * نسبة الضريبة بقت إعداد محفوظ في السيرفر — مش قيمة بتتبعت مع الطلب.
 * بنكتبها في القاعدة وبنكسر كاش الإعدادات عشان الطلب اللي بعدها يشوفها.
 */
export async function setTaxRate(rate: number) {
  await pool.query("UPDATE settings SET tax_rate = ? WHERE id = 1", [rate]);
  invalidateSettingsCache();
}

/** Logs in and returns the session cookie to attach to later requests. */
export async function loginAs(role: keyof typeof CREDENTIALS): Promise<string> {
  const res = await request(app).post("/api/auth/login").send(CREDENTIALS[role]);
  if (res.status !== 200) {
    throw new Error(`login as ${role} failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const cookies = res.headers["set-cookie"];
  const list = Array.isArray(cookies) ? cookies : [cookies];
  return list.map((c: string) => c.split(";")[0]).join("; ");
}

export function trackOrder(id: number) {
  orderIds.push(id);
}

/** بيرجّع طاولات الاختبار لحالة "متاحة" — من غير ما يلمس طاولات غيره. */
export async function freeOwnTables() {
  if (!fixtures?.tableIds.length) return;
  await pool.query(
    `UPDATE restaurant_tables SET status = 'free' WHERE id IN (${fixtures.tableIds
      .map(() => "?")
      .join(",")})`,
    fixtures.tableIds
  );
}

export async function freeTableId(): Promise<number> {
  const [rows] = await pool.query<any[]>(
    `SELECT id FROM restaurant_tables
     WHERE status = 'free' AND id IN (${fixtures!.tableIds.map(() => "?").join(",")})
     ORDER BY id ASC LIMIT 1`,
    fixtures!.tableIds
  );
  if (!rows[0]) throw new Error("no free test table left");
  return rows[0].id;
}

/** بيمسح كل صف عملته التشغيلة دي — بالترتيب اللي المفاتيح الأجنبية بتسمح بيه. */
export async function teardown() {
  try {
    if (orderIds.length) {
      const list = orderIds.join(",");
      await pool.query(`DELETE FROM order_items WHERE order_id IN (${list})`);
      await pool.query(`DELETE FROM orders WHERE id IN (${list})`);
    }

    if (fixtures) {
      const items = [fixtures.itemId, ...extraItemIds];
      await pool.query(`DELETE FROM menu_items WHERE id IN (${items.join(",")})`);
      await pool.query("DELETE FROM categories WHERE id = ?", [fixtures.categoryId]);
      if (fixtures.tableIds.length) {
        await pool.query(
          `DELETE FROM restaurant_tables WHERE id IN (${fixtures.tableIds.join(",")})`
        );
      }
      await setTaxRate(0);
    }

    await pool.query("DELETE FROM users WHERE email LIKE ?", [`${NS}.%@amber-pos.test`]);
  } finally {
    await pool.end();
  }
}
