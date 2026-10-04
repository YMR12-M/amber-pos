/**
 * مولّد أصول الهوية الثابتة.
 *
 *   npm run brand
 *
 * بيقرا الشكل من `src/components/brand/geometry.ts` والنصوص من
 * `src/components/brand/brand.ts` — نفس الملفين اللي التطبيق بيستخدمهم —
 * وبيكتب ملفات `public/`:
 *
 *   favicon.svg        أيقونة التبويب
 *   logo-mark.svg      نسخة عامة (PWA · apple-touch-icon · README)
 *   logo-mono.svg      لون واحد (تثبيت التبويب في سفاري)
 *   icon-maskable.svg  أيقونة PWA قابلة للقص
 *   og.svg             بطاقة المشاركة 1200×630
 *
 * وكمان بيحقن شعار شاشة الإقلاع جوّه `index.html` بين العلامتين
 * `brand:boot:start` و `brand:boot:end` — أول إطار بيشوفه الكاشير.
 *
 * السبب: العلامة كانت بتتكتب بإيدنا في ٦ أماكن، وأول تعديل كان بيخلّي
 * أيقونة التبويب مختلفة عن اللي جوّه التطبيق. دلوقتي مصدر واحد.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BAR,
  COLORS,
  DISK,
  DOME,
  KNOB,
  MONO_PATH,
  SHADOW,
} from "../src/components/brand/geometry.ts";
import { BRAND } from "../src/components/brand/brand.ts";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const NOTE = `<!-- مولّد آلياً بـ \`npm run brand\` من src/components/brand/geometry.ts — ما تعدّلش هنا. -->`;

/** غطاء التقديم: مقبض · قبّة · قاعدة. */
const cloche = (fill = COLORS.ink) =>
  `<g fill="${fill}">` +
  `<circle cx="${KNOB.cx}" cy="${KNOB.cy}" r="${KNOB.r}"/>` +
  `<path d="${DOME}"/>` +
  `<rect x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" rx="${BAR.r}"/>` +
  `</g>`;

/** بادج المينا كامل: سُمك مصمت مزاح · قرص عنبر بحلقة حبر · الغطاء. */
const badge = () =>
  `<circle cx="${DISK.cx + SHADOW.dx}" cy="${DISK.cy + SHADOW.dy}" r="${DISK.r + DISK.stroke / 2}" fill="${COLORS.ink}"/>` +
  `<circle cx="${DISK.cx}" cy="${DISK.cy}" r="${DISK.r}" fill="${COLORS.amber}" stroke="${COLORS.ink}" stroke-width="${DISK.stroke}"/>` +
  cloche();

const files = {
  /* ------------------------------ الأيقونة ------------------------------ */
  "favicon.svg": `${NOTE}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="${BRAND.name} ${BRAND.suffix}">
  ${badge()}
</svg>
`,

  /* --------------------------- نسخة لون واحد ---------------------------- */
  "logo-mono.svg": `${NOTE}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="${BRAND.name} ${BRAND.suffix}">
  <path fill-rule="evenodd" d="${MONO_PATH}"/>
</svg>
`,

  /* ------------------------ أيقونة PWA قابلة للقص ------------------------
     الخلفية عنبر سابحة لحدود اللوحة والغطاء جوّه المنطقة الآمنة (80%)،
     عشان أي نظام يقصّها دايرة أو مربّع مدوّر من غير ما ياكل من الغطاء. */
  "icon-maskable.svg": `${NOTE}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192" role="img" aria-label="${BRAND.name} ${BRAND.suffix}">
  <rect width="192" height="192" fill="${COLORS.amber}"/>
  <g transform="translate(96 96) scale(3) translate(-22 -22)">${cloche()}</g>
</svg>
`,

  /* --------------------------- بطاقة المشاركة ---------------------------
     ورق كريمي وحبر وبادج — مفيش تدرّجات. الخطوط بتقع على fallback لو
     السكرابر مش عنده El Messiri. */
  "og.svg": `${NOTE}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="${COLORS.paper}"/>
  <rect x="24" y="24" width="1152" height="582" fill="none" stroke="${COLORS.ink}" stroke-width="3"/>
  <rect x="34" y="34" width="1132" height="562" fill="none" stroke="${COLORS.ink}" stroke-width="1" stroke-dasharray="6 6"/>
  <g transform="translate(848 150) scale(4.2)">${badge()}</g>
  <text x="780" y="280" text-anchor="end" font-family="'El Messiri', Cairo, 'Geeza Pro', 'SF Arabic', sans-serif" font-size="128" font-weight="700" fill="${COLORS.ink}">${BRAND.name}</text>
  <text x="780" y="342" text-anchor="end" font-family="'IBM Plex Mono', Menlo, monospace" font-size="24" font-weight="600" fill="#8a4e04" letter-spacing="10">${BRAND.latin}</text>
  <line x1="180" y1="384" x2="780" y2="384" stroke="${COLORS.ink}" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>
  <text x="780" y="440" text-anchor="end" font-family="'IBM Plex Sans Arabic', Cairo, 'Geeza Pro', 'SF Arabic', sans-serif" font-size="36" font-weight="600" fill="${COLORS.ink}">${BRAND.tagline}</text>
  <text x="780" y="494" text-anchor="end" font-family="'IBM Plex Sans Arabic', Cairo, 'Geeza Pro', 'SF Arabic', sans-serif" font-size="28" font-weight="500" fill="#54463a">كاشير · مطبخ · إدارة — في شاشة واحدة</text>
</svg>
`,

  /* ------------------------------ البيان ------------------------------- */
  "manifest.webmanifest": `${JSON.stringify(
    {
      name: `${BRAND.name} ${BRAND.suffix} — ${BRAND.tagline}`,
      short_name: `${BRAND.name} ${BRAND.suffix}`,
      description: BRAND.promise,
      id: "/",
      start_url: "/",
      scope: "/",
      lang: "ar",
      dir: "rtl",
      display: "standalone",
      display_override: ["fullscreen", "standalone"],
      // شاشة الكاشير تابلت أفقي — التطبيق مصمّم للاتجاه ده
      orientation: "landscape",
      background_color: "#1a1410",
      // لون شريط الترويسة — بيفضل داكن في الوضعين
      theme_color: "#2b1f17",
      categories: ["business", "food", "productivity"],
      icons: [
        { src: "/logo-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "نقطة البيع", short_name: "كاشير", url: "/pos" },
        { name: "شاشة المطبخ", short_name: "مطبخ", url: "/kitchen" },
        { name: "لوحة التحكم", short_name: "إدارة", url: "/admin" },
      ],
    },
    null,
    2
  )}\n`,
};

for (const [name, body] of Object.entries(files)) {
  writeFileSync(join(PUBLIC, name), body, "utf8");
  console.log(`  ✓ public/${name}`);
}

// logo-mark.svg = نسخة من الأيقونة باسم عام (PWA · README · apple-touch-icon)
writeFileSync(join(PUBLIC, "logo-mark.svg"), files["favicon.svg"], "utf8");
console.log("  ✓ public/logo-mark.svg");

/* ------------------- شعار الإقلاع داخل index.html --------------------
   الشعار ده بيترسم قبل ما أي JS يتحمّل، فلازم يكون HTML خام —
   ومن غير الحقن ده كان هيبقى النسخة السابعة اليدوية من العلامة.
   على السطح الداكن: حلقة كريمي وسُمك نحاسي (نغمة onDark). */
const INDEX = join(dirname(fileURLToPath(import.meta.url)), "..", "index.html");
const START = "<!-- brand:boot:start -->";
const END = "<!-- brand:boot:end -->";

const boot =
  `<svg width="88" height="88" viewBox="0 0 48 48" fill="none" role="img" aria-label="${BRAND.name} ${BRAND.suffix}">` +
  `<circle cx="${DISK.cx + SHADOW.dx}" cy="${DISK.cy + SHADOW.dy}" r="${DISK.r + DISK.stroke / 2}" fill="${COLORS.brass}"/>` +
  `<circle cx="${DISK.cx}" cy="${DISK.cy}" r="${DISK.r}" fill="${COLORS.amber}" stroke="${COLORS.cream}" stroke-width="${DISK.stroke}"/>` +
  cloche() +
  `</svg>`;

const html = readFileSync(INDEX, "utf8");
const a = html.indexOf(START);
const b = html.indexOf(END);
if (a === -1 || b === -1) {
  console.error(`  ✗ index.html: مش لاقي العلامتين ${START} / ${END}`);
  process.exitCode = 1;
} else {
  writeFileSync(
    INDEX,
    `${html.slice(0, a + START.length)}\n        ${boot}\n        ${html.slice(b)}`,
    "utf8"
  );
  console.log("  ✓ index.html (شعار الإقلاع)");
}

console.log(`\nأصول ${BRAND.name} ${BRAND.suffix} ${BRAND.version} اتولّدت.`);
