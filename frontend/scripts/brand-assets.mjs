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

import { BAR, DOME, GRADIENT, KNOB, MONO_PATH, SQUIRCLE } from "../src/components/brand/geometry.ts";
import { BRAND } from "../src/components/brand/brand.ts";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const NOTE = `<!-- مولّد آلياً بـ \`npm run brand\` من src/components/brand/geometry.ts — ما تعدّلش هنا. -->`;

const stops = (id) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
  GRADIENT.map((s) => `<stop offset="${s.at}" stop-color="${s.color}"/>`).join("") +
  `</linearGradient>`;

/** الغطاء الأبيض: مقبض · قبّة · قاعدة. */
const cloche = (fill = "#fff") =>
  `<g fill="${fill}">` +
  `<circle cx="${KNOB.cx}" cy="${KNOB.cy}" r="${KNOB.r}"/>` +
  `<path d="${DOME}"/>` +
  `<rect x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" rx="${BAR.r}"/>` +
  `</g>`;

const files = {
  /* ------------------------------ الأيقونة ------------------------------ */
  "favicon.svg": `${NOTE}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="${BRAND.name} ${BRAND.suffix}">
  <defs>
    ${stops("bg")}
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.32"/>
      <stop offset="58%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <path d="${SQUIRCLE}" fill="url(#bg)"/>
  <path d="${SQUIRCLE}" fill="url(#gloss)"/>
  ${cloche()}
</svg>
`,

  /* --------------------------- نسخة لون واحد ---------------------------- */
  "logo-mono.svg": `${NOTE}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="${BRAND.name} ${BRAND.suffix}">
  <path fill-rule="evenodd" d="${MONO_PATH}"/>
</svg>
`,

  /* ------------------------ أيقونة PWA قابلة للقص ------------------------
     الخلفية سابحة لحدود اللوحة والعلامة جوّه المنطقة الآمنة (80%)،
     عشان أي نظام يقصّها دايرة أو مربّع مدوّر من غير ما ياكل من الغطاء. */
  "icon-maskable.svg": `${NOTE}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192" role="img" aria-label="${BRAND.name} ${BRAND.suffix}">
  <defs>${stops("bg")}</defs>
  <rect width="192" height="192" fill="url(#bg)"/>
  <g transform="translate(96 96) scale(2.4) translate(-24 -24)">${cloche()}</g>
</svg>
`,

  /* --------------------------- بطاقة المشاركة --------------------------- */
  "og.svg": `${NOTE}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    ${stops("mark")}
    <radialGradient id="glowA"><stop offset="0%" stop-color="#ff6b35" stop-opacity="0.34"/><stop offset="100%" stop-color="#ff6b35" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowB"><stop offset="0%" stop-color="#2563eb" stop-opacity="0.26"/><stop offset="100%" stop-color="#2563eb" stop-opacity="0"/></radialGradient>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M56 0H0v56" fill="none" stroke="#fff" stroke-opacity="0.03" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#0b1020"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <ellipse cx="930" cy="120" rx="520" ry="380" fill="url(#glowA)"/>
  <ellipse cx="180" cy="580" rx="460" ry="340" fill="url(#glowB)"/>
  <g transform="translate(848 160) scale(3.6)">
    <path d="${SQUIRCLE}" fill="url(#mark)"/>
    ${cloche()}
  </g>
  <text x="756" y="288" text-anchor="end" font-family="Cairo, 'Geeza Pro', 'SF Arabic', sans-serif" font-size="112" font-weight="800" fill="#fff">${BRAND.name}</text>
  <text x="756" y="348" text-anchor="end" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-size="24" font-weight="700" fill="#ff8a4d" letter-spacing="10">${BRAND.latin}</text>
  <text x="756" y="424" text-anchor="end" font-family="Cairo, 'Geeza Pro', 'SF Arabic', sans-serif" font-size="36" font-weight="600" fill="#a8b3c9">${BRAND.tagline}</text>
  <text x="756" y="480" text-anchor="end" font-family="Cairo, 'Geeza Pro', 'SF Arabic', sans-serif" font-size="28" font-weight="700" fill="#eaeefa">كاشير · مطبخ · إدارة — في شاشة واحدة</text>
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
      background_color: "#0b1020",
      theme_color: "#f4f6fb",
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
   ومن غير الحقن ده كان هيبقى النسخة السابعة اليدوية من العلامة. */
const INDEX = join(dirname(fileURLToPath(import.meta.url)), "..", "index.html");
const START = "<!-- brand:boot:start -->";
const END = "<!-- brand:boot:end -->";

const boot =
  `<svg width="88" height="88" viewBox="0 0 48 48" fill="none" role="img" aria-label="${BRAND.name} ${BRAND.suffix}">` +
  `<defs>${stops("boot-g")}</defs>` +
  `<path d="${SQUIRCLE}" fill="url(#boot-g)"/>` +
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
