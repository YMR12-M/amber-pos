import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import menuRoutes from "./routes/menu.routes";
import tablesRoutes from "./routes/tables.routes";
import ordersRoutes from "./routes/orders.routes";
import usersRoutes from "./routes/users.routes";
import settingsRoutes from "./routes/settings.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimit";

const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";

interface Frontend {
  dir: string;
  indexHtml: string;
  /** بصمات السكربتات السطرية جوّه index.html — بتتحط في CSP بالاسم. */
  scriptHashes: string[];
}

/**
 * `index.html` فيه سكربت سطري بيطبّق الثيم قبل أول رسمة (بيمنع وميض
 * الشاشة البيضا). سياسة `script-src 'self'` بتمنع السكربتات السطرية،
 * فبنحسب بصمة SHA-256 للسكربت ونسمح بيها بالاسم — كده السكربت بتاعنا
 * شغّال وأي سكربت سطري محقون تاني بيفضل مرفوض.
 */
function inlineScriptHashes(indexHtml: string): string[] {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  const hashes: string[] = [];
  for (const match of indexHtml.matchAll(re)) {
    const body = match[1];
    if (!body.trim()) continue;
    hashes.push(`'sha256-${crypto.createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  return hashes;
}

function loadFrontend(): Frontend | null {
  const dir = env.staticDir;
  const indexPath = path.join(dir, "index.html");

  if (!fs.existsSync(indexPath)) {
    console.warn(
      `تحذير: SERVE_STATIC مفعّل بس مفيش نسخة مبنيّة في ${dir}\n` +
        "        شغّل: cd frontend && npm run build"
    );
    return null;
  }

  const indexHtml = fs.readFileSync(indexPath, "utf8");
  return { dir, indexHtml, scriptHashes: inlineScriptHashes(indexHtml) };
}

/**
 * تقديم نسخة الواجهة المبنيّة من نفس السيرفر.
 *
 * ده اللي بيخلي النشر خطوة واحدة: أصل واحد للواجهة والـ API، يعني مفيش
 * CORS ولا كوكيز عابرة للنطاقات — أأمن وأبسط من رفع الاتنين منفصلين.
 * بيتفعّل بـ `SERVE_STATIC=true` في `.env`.
 */
function mountFrontend(app: express.Express, fe: Frontend) {
  app.use(
    express.static(fe.dir, {
      // ملفات Vite اسمها فيه بصمة المحتوى، فالكاش الطويل آمن.
      // `index.html` نفسها لأ — لازم تتسأل عليها كل مرة عشان تحديث
      // النظام يوصل لتابلت الكاشير من غير ما حد يمسح الكاش بإيده.
      maxAge: "1y",
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
      },
    })
  );

  // SPA: أي مسار مش `/api` بيرجّع الصفحة، والراوتر في المتصفح بيكمّل.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.type("html").send(fe.indexHtml);
  });
}

function contentSecurityPolicy(scriptHashes: string[]) {
  return {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      scriptSrc: ["'self'", ...scriptHashes],
      scriptSrcAttr: ["'none'"],
      // الخطوط من Google Fonts: ملف CSS من googleapis وملفات الخط من gstatic.
      // `unsafe-inline` للستايل بس — Vite بيحقن ستايلات سطرية وقت التحميل.
      styleSrc: ["'self'", "'unsafe-inline'", GOOGLE_FONTS_CSS],
      fontSrc: ["'self'", "data:", GOOGLE_FONTS_FILES],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      manifestSrc: ["'self'"],
      ...(env.isProd ? { upgradeInsecureRequests: [] } : {}),
    },
  };
}

export function createApp() {
  const app = express();

  // Behind a proxy the client IP comes from X-Forwarded-For; rate limiting
  // needs the real one to not bucket everyone together.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  const frontend = env.serveStatic ? loadFrontend() : null;

  app.use(
    helmet({
      contentSecurityPolicy: contentSecurityPolicy(frontend?.scriptHashes ?? []),
      // HSTS في الإنتاج بس — على http محلي بيقفل المتصفح على https غلط.
      hsts: env.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    })
  );

  // Explicit allowlist — credentials can't be sent to a wildcard origin.
  // لما الواجهة بتتقدّم من نفس السيرفر مفيش أصل تاني، فالقايمة بتبقى فاضية.
  if (env.corsOrigin.length > 0) {
    app.use(cors({ origin: env.corsOrigin, credentials: true }));
  }

  app.use(compression());
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api", apiLimiter);
  app.use("/api/auth", authRoutes);
  app.use("/api/menu", menuRoutes);
  app.use("/api/tables", tablesRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/settings", settingsRoutes);

  if (frontend) mountFrontend(app, frontend);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
