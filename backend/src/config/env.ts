import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production";

/** أمثلة بتتكتب في الشروحات — أي واحدة منهم معناها الإعداد ما اتغيّرش. */
const INSECURE_SECRETS = new Set([
  "change_this_secret_key",
  "your_secret_here",
  "secret",
  "changeme",
  "dev",
  "test",
]);

const GENERATE_HINT =
  'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"';

function fail(message: string): never {
  throw new Error(message);
}

function requireSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim() === "") {
    fail(`JWT_SECRET غير موجود في .env — شغّل: ${GENERATE_HINT} وحط الناتج في JWT_SECRET`);
  }
  if (INSECURE_SECRETS.has(secret)) {
    fail(`JWT_SECRET لسه على قيمة افتراضية (${secret}). ولّد مفتاح حقيقي: ${GENERATE_HINT}`);
  }
  if (secret.length < 32) {
    fail(`JWT_SECRET قصير جداً (${secret.length} حرف) — لازم 32 حرف على الأقل.`);
  }
  return secret;
}

const bool = (value: string | undefined, fallback = false) =>
  value === undefined ? fallback : ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());

/**
 * `Number(x) || fallback` بيبلع الصفر — `MAX_TAX_RATE=0` (يعني امنع أي
 * ضريبة) كان بيرجع 0.5. هنا الصفر قيمة صحيحة زي أي رقم.
 */
function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const corsOrigin = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// الواجهة بتتقدّم من نفس السيرفر افتراضياً في الإنتاج — أصل واحد، مفيش CORS.
const serveStatic = bool(process.env.SERVE_STATIC, isProd);

/**
 * `SameSite=Strict` هو الافتراضي والأأمن، وبيشتغل لما الواجهة والـ API على
 * نفس الأصل (وده اللي `SERVE_STATIC` بيعمله، وكمان اللي بروكسي Vite بيعمله
 * وقت التطوير).
 *
 * لو نشرت الواجهة على دومين تاني غير الـ API، المتصفح **مش** هيبعت كوكي
 * Strict مع نداءات الـ API، فلازم `COOKIE_SAMESITE=none` — ودي بتفرض HTTPS.
 */
function cookieSameSite(): "strict" | "lax" | "none" {
  const value = (process.env.COOKIE_SAMESITE ?? "strict").trim().toLowerCase();
  if (value !== "strict" && value !== "lax" && value !== "none") {
    fail(`COOKIE_SAMESITE لازم تكون strict أو lax أو none — مش "${value}"`);
  }
  if (value === "none" && !isProd) {
    fail("COOKIE_SAMESITE=none بتحتاج HTTPS، فمش هتشتغل على التطوير المحلي.");
  }
  return value;
}

const db = {
  host: process.env.DB_HOST || "localhost",
  port: num(process.env.DB_PORT, 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pos_system",
};

/** فحوصات بتتطبّق في الإنتاج بس — التطوير المحلي بيفضل مريح. */
function assertProductionSanity() {
  if (!isProd) return;

  if (!db.password) {
    fail(
      `DB_PASSWORD فاضية والمستخدم "${db.user}" — قاعدة بيانات من غير كلمة مرور مينفعش تتنشر.\n` +
        "اعمل مستخدم مخصّص للنظام بصلاحيات على قاعدته بس."
    );
  }
  if (db.user === "root") {
    console.warn(
      'تحذير: بتشغّل الإنتاج بمستخدم "root" لقاعدة البيانات.\n' +
        "        الأفضل مستخدم مخصّص بصلاحيات على قاعدة النظام بس."
    );
  }
  if (corsOrigin.includes("*")) {
    fail('CORS_ORIGIN مينفعش تكون "*" — الكوكي مش بتتبعت لأصل عام.');
  }
  if (!serveStatic && corsOrigin.length === 0) {
    fail(
      "SERVE_STATIC=false ومفيش CORS_ORIGIN — مفيش حد هيقدر يوصل للـ API.\n" +
        "يا تخلي السيرفر يقدّم الواجهة (SERVE_STATIC=true) يا تحدد دومين الواجهة في CORS_ORIGIN."
    );
  }
}

export const env = {
  port: num(process.env.PORT, 4000),
  nodeEnv,
  isProd,

  jwtSecret: requireSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  cookieSameSite: cookieSameSite(),

  corsOrigin,
  serveStatic,
  /** مكان نسخة الواجهة المبنيّة — `backend/../frontend/dist` افتراضياً. */
  staticDir: process.env.STATIC_DIR
    ? path.resolve(process.env.STATIC_DIR)
    : path.resolve(__dirname, "../../../frontend/dist"),

  db,

  // Business rules
  maxTaxRate: Math.max(0, num(process.env.MAX_TAX_RATE, 0.5)),
  /** سقف نداءات الـ API لكل IP في الدقيقة — محل بأجهزة كتير محتاج أعلى. */
  apiRateLimit: num(process.env.API_RATE_LIMIT, 600),
  maxPageSize: 100,
  defaultPageSize: 25,
};

assertProductionSanity();
