/* ============================================================================
   عنبر POS — تجهيز أول تشغيل.

     npm run setup

   بيعمل تلات حاجات، وكلها **قابلة لإعادة التشغيل** من غير ضرر:
     1. بينشئ قاعدة البيانات والجداول من `schema.sql`
     2. بيضيف أي عمود ناقص في قاعدة قديمة (ترقية)
     3. بينشئ أول حساب أدمن — لو مفيش أدمن أصلاً

   **مفيش أي بيانات تجريبية.** مفيش منيو جاهز ولا طاولات ولا حسابات
   مشتركة بباسورد معروف. الأصناف والطاولات وبيانات المحل كلها بتتدخل
   من لوحة التحكم.

   للتشغيل من غير أسئلة (Docker · CI · سيرفر بعيد) حط المتغيرات دي:
     SETUP_ADMIN_NAME · SETUP_ADMIN_EMAIL · SETUP_ADMIN_PASSWORD
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { env } from "../config/env";

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD = 10;

/* ----------------------------- أدوات الطرفية ----------------------------- */

const ESC = String.fromCharCode(27);
const c = {
  bold: (s: string) => `${ESC}[1m${s}${ESC}[0m`,
  dim: (s: string) => `${ESC}[2m${s}${ESC}[0m`,
  green: (s: string) => `${ESC}[32m${s}${ESC}[0m`,
  red: (s: string) => `${ESC}[31m${s}${ESC}[0m`,
  yellow: (s: string) => `${ESC}[33m${s}${ESC}[0m`,
};

const KEY_ENTER = ["\n", "\r"];
const KEY_EOF = String.fromCharCode(4);
const KEY_SIGINT = String.fromCharCode(3);
const KEY_BACKSPACE = [String.fromCharCode(127), String.fromCharCode(8)];

const isInteractive = process.stdin.isTTY === true;

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

/** نفس `ask` بس الحروف ما تتطبعش — الباسورد ما يفضلش مكتوب في الطرفية. */
function askSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    const input = process.stdin;
    process.stdout.write(question);

    let value = "";
    const wasRaw = input.isRaw === true;
    input.setRawMode?.(true);
    input.resume();
    input.setEncoding("utf8");

    const finish = () => {
      input.setRawMode?.(wasRaw);
      input.pause();
      input.removeListener("data", onData);
      process.stdout.write("\n");
      resolve(value);
    };

    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (KEY_ENTER.includes(ch) || ch === KEY_EOF) return finish();
        if (ch === KEY_SIGINT) {
          input.setRawMode?.(wasRaw);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (KEY_BACKSPACE.includes(ch)) {
          value = value.slice(0, -1);
          continue;
        }
        value += ch;
      }
    };

    input.on("data", onData);
  });
}

/* ------------------------------- التحقّقات ------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) {
    return `كلمة المرور قصيرة — لازم ${MIN_PASSWORD} حروف على الأقل (دخلت ${password.length}).`;
  }
  if (!/[A-Za-z؀-ۿ]/.test(password) || !/[0-9]/.test(password)) {
    return "كلمة المرور لازم تجمع حروف وأرقام.";
  }
  if (/^(?:password|12345678|qwerty|admin)/i.test(password)) {
    return "كلمة المرور دي متوقّعة جداً — اختار واحدة تانية.";
  }
  return null;
}

/* ------------------------------- الخطوات -------------------------------- */

/**
 * تطبيق `schema.sql`.
 *
 * الاتصال هنا من غير `database` لأن الملف نفسه بيعمل `CREATE DATABASE`،
 * و`multipleStatements` عشان يتنفّذ كملف واحد.
 */
async function applySchema() {
  const file = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(file, "utf8").replace(/pos_system/g, env.db.database);

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
    console.log(`${c.green("✓")} الجداول جاهزة في قاعدة ${c.bold(env.db.database)}`);
  } finally {
    await conn.end();
  }
}

async function columnsOf(conn: mysql.Connection, table: string): Promise<Set<string>> {
  const [cols] = await conn.query<any[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [env.db.database, table]
  );
  return new Set(cols.map((r) => r.COLUMN_NAME));
}

/**
 * ترقية قاعدة قديمة: بنضيف الأعمدة اللي اتضافت بعد أول إصدار.
 * `CREATE TABLE IF NOT EXISTS` ما بيلمسش جدول موجود، فالخطوة دي ضرورية
 * لأي حد كان مشغّل نسخة أقدم.
 */
async function migrate(conn: mysql.Connection) {
  const tables = await columnsOf(conn, "restaurant_tables");
  if (!tables.has("is_active")) {
    await conn.query(
      "ALTER TABLE restaurant_tables ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER status"
    );
    console.log(`${c.green("✓")} ترقية: عمود الأرشفة اتضاف لجدول الطاولات`);
  }

  const users = await columnsOf(conn, "users");
  if (!users.has("tokens_valid_from")) {
    await conn.query(
      `ALTER TABLE users ADD COLUMN tokens_valid_from TIMESTAMP
       NULL DEFAULT NULL AFTER is_active`
    );
    console.log(`${c.green("✓")} ترقية: إلغاء الجلسات عند الإيقاف اتفعّل`);
  }

  await conn.query("INSERT IGNORE INTO settings (id) VALUES (1)");
}

async function createFirstAdmin(conn: mysql.Connection) {
  const [admins] = await conn.query<any[]>(
    "SELECT id, email FROM users WHERE role = 'admin' LIMIT 1"
  );

  if (admins.length > 0) {
    console.log(
      `${c.dim("•")} في حساب أدمن بالفعل (${admins[0].email}) — مش هنعمل حساب جديد.\n` +
        `  ${c.dim("لإضافة موظفين تانيين: لوحة التحكم ← الموظفين.")}`
    );
    return;
  }

  let name = process.env.SETUP_ADMIN_NAME?.trim() ?? "";
  let email = process.env.SETUP_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  let password = process.env.SETUP_ADMIN_PASSWORD ?? "";

  const fromEnv = Boolean(name && email && password);

  if (fromEnv) {
    if (!EMAIL_RE.test(email)) throw new Error(`SETUP_ADMIN_EMAIL مش بريد صحيح: ${email}`);
    const problem = passwordProblem(password);
    if (problem) throw new Error(`SETUP_ADMIN_PASSWORD: ${problem}`);
  } else {
    if (!isInteractive) {
      throw new Error(
        "مفيش حساب أدمن، والتشغيل مش تفاعلي.\n" +
          "شغّل الأمر من الطرفية، أو حدّد: SETUP_ADMIN_NAME · SETUP_ADMIN_EMAIL · SETUP_ADMIN_PASSWORD"
      );
    }

    console.log(`\n${c.bold("إنشاء حساب المالك (أدمن)")}`);
    console.log(c.dim("الحساب ده بيفتح لوحة التحكم — المنيو والطاولات والتقارير والموظفين.\n"));

    while (name.length < 2) {
      name = await ask("الاسم                : ");
      if (name.length < 2) console.log(c.red("  الاسم قصير جداً."));
    }

    while (!EMAIL_RE.test(email)) {
      email = (await ask("البريد الإلكتروني    : ")).toLowerCase();
      if (!EMAIL_RE.test(email)) console.log(c.red("  البريد مش صحيح."));
    }

    for (;;) {
      password = await askSecret(`كلمة المرور (${MIN_PASSWORD}+) : `);
      const problem = passwordProblem(password);
      if (problem) {
        console.log(c.red(`  ${problem}`));
        continue;
      }
      const again = await askSecret("تأكيد كلمة المرور    : ");
      if (again !== password) {
        console.log(c.red("  الكلمتين مش زي بعض."));
        continue;
      }
      break;
    }
  }

  const [clash] = await conn.query<any[]>("SELECT id FROM users WHERE email = ?", [email]);
  if (clash.length > 0) throw new Error(`البريد ${email} مستخدم بالفعل.`);

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await conn.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
    [name, email, hash]
  );

  console.log(`\n${c.green("✓")} اتعمل حساب الأدمن: ${c.bold(email)}`);
}

/* -------------------------------- التشغيل -------------------------------- */

async function main() {
  console.log(c.bold("\nعنبر POS — تجهيز النظام\n"));

  await applySchema();

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
  });

  try {
    await migrate(conn);
    await createFirstAdmin(conn);

    const [settings] = await conn.query<any[]>("SELECT merchant_name FROM settings WHERE id = 1");
    if (!settings[0]?.merchant_name) {
      console.log(
        `\n${c.yellow("!")} بيانات المحل لسه فاضية.\n` +
          `  افتح ${c.bold("لوحة التحكم ← الإعدادات")} واملا الاسم والعنوان والرقم الضريبي\n` +
          `  ${c.dim("— دي اللي بتتطبع على الفاتورة.")}`
      );
    }

    console.log(`\n${c.green("تم.")} شغّل السيرفر: ${c.bold("npm run dev")}\n`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(`\n${c.red("فشل التجهيز:")} ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
