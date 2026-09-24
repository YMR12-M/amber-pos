import { useId } from "react";
import { BRAND, BRAND_FULL } from "./brand";
import { BAR, DOME, GRADIENT, KNOB, SQUIRCLE } from "./geometry";

export { BRAND, BRAND_FULL, MERCHANT_FALLBACK, orderNo } from "./brand";

/* ============================================================================
   الشعار — "عنبر · AMBER POS"

   العلامة: مربّع مائل (squircle) بتدرّج العنبر، جوّاه غطاء تقديم (cloche)
   أبيض مصمت.

   القبّة **واطية وعريضة** (نصف محور 14.5×9.6) والمقبض صغير وقريب منها —
   ودي مش تفصيلة شكلية: القبّة العالية والمقبض الكبير بيتقروا "راس وكتافين"
   يعني أيقونة مستخدم، والواطية العريضة بتتقرا غطاء تقديم فوراً.
   القاعدة أعرض من القبّة عشان الشكل يقف مستقر.

   مفيش أي عنصر أرفع من 2.3px في مساحة 48 — فبيفضل مقروء من 16px
   (التبويب) لحد 128px (شاشة الدخول) من غير ما يتفتّت.

   المسارات نفسها جاية من `geometry.ts`، ونفس الملف بيولّد ملفات
   `public/` (favicon · PWA · og) عن طريق `npm run brand` —
   فمفيش نسختين للعلامة تفرقوا مع الوقت.
   ========================================================================== */

/**
 * نغمة العلامة:
 * - `brand` تدرّج العنبر — الاستخدام الافتراضي على أي سطح ملوّن.
 * - `mono`  لون واحد موروث بـ `currentColor` — للأماكن اللي بتفرض لون
 *           (شريط داكن · نص مضمّن · حالة معطّلة).
 * - `print` أسود مصمت — الفاتورة الحرارية بتطبع أبيض/أسود بس.
 */
export type LogoTone = "brand" | "mono" | "print";

export function LogoMark({
  size = 40,
  tone = "brand",
  className,
}: {
  size?: number;
  tone?: LogoTone;
  className?: string;
}) {
  // معرّف فريد لكل نسخة — من غيره تدرّجين على نفس الصفحة بيتصادموا
  const uid = useId().replace(/:/g, "");
  const plate = tone === "print" ? "#000" : tone === "mono" ? "currentColor" : `url(#bg-${uid})`;
  const cut = tone === "brand" ? "#fff" : tone === "print" ? "#fff" : "var(--surface, #fff)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label={BRAND_FULL}
    >
      {tone === "brand" && (
        <defs>
          <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
            {GRADIENT.map((s) => (
              <stop key={s.at} offset={s.at} stopColor={s.color} />
            ))}
          </linearGradient>
          <linearGradient id={`gloss-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.32" />
            <stop offset="58%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
      )}

      <path d={SQUIRCLE} fill={plate} />
      {tone === "brand" && <path d={SQUIRCLE} fill={`url(#gloss-${uid})`} />}

      {/* غطاء التقديم: مقبض · قبّة · قاعدة — كلها مصمتة، مفيش strokes */}
      <g fill={cut}>
        <circle cx={KNOB.cx} cy={KNOB.cy} r={KNOB.r} />
        <path d={DOME} />
        <rect x={BAR.x} y={BAR.y} width={BAR.w} height={BAR.h} rx={BAR.r} />
      </g>
    </svg>
  );
}

/* --------------------------------- الاسم ---------------------------------- */

/**
 * الاسم المكتوب — نص HTML مش SVG، عشان يورث خط النظام وياخد
 * كل تحسينات الـ hinting على الشاشات العادية.
 *
 * التجميعة سطرين: **عنبر** كبير، وتحته **AMBER POS** صغير ومتباعد.
 * العربي هو الاسم واللاتيني هو التوقيع — فمفيش تكرار لكلمة "POS"
 * في السطرين، والعين بتمسك اسم واحد بس.
 *
 * `BRAND.suffix` لسه موجود للسياقات النصية (عنوان الصفحة · الفاتورة ·
 * بيان التطبيق) — بس مش بيتكرر جوّه التجميعة.
 */
export function Wordmark({
  size = "md",
  onDark = false,
}: {
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
}) {
  return (
    <span className={`wordmark wordmark--${size}${onDark ? " wordmark--ondark" : ""}`}>
      <span className="wordmark__ar">{BRAND.name}</span>
      <span className="wordmark__latin">{BRAND.latin}</span>
    </span>
  );
}

/* ------------------------------- التجميعة --------------------------------- */

/**
 * التجميعة الرسمية = علامة + اسم. استخدمها بدل ما تركّب الاتنين بإيدك،
 * عشان المسافة بينهم تفضل واحدة في كل الشاشات.
 *
 * `inline`  → التوب بار · الترويسات   ·  `stacked` → الدخول · الانتظار
 */
export function Logo({
  size = "md",
  layout = "inline",
  tagline = false,
  onDark = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  layout?: "inline" | "stacked";
  tagline?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  const markSize = { sm: 30, md: 40, lg: 76 }[size];

  return (
    <span
      className={`logo logo--${layout} logo--${size}${onDark ? " logo--ondark" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <LogoMark size={markSize} />
      <span className="logo__text">
        <Wordmark size={size} onDark={onDark} />
        {tagline && <span className="logo__tagline">{BRAND.tagline}</span>}
      </span>
    </span>
  );
}
