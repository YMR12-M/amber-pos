import { BRAND, BRAND_FULL } from "./brand";
import { BAR, COLORS, DISK, DOME, KNOB, MONO_PATH, SHADOW } from "./geometry";

export { BRAND, BRAND_FULL, MERCHANT_FALLBACK, orderNo } from "./brand";

/* ============================================================================
   الشعار — "عنبر · AMBER POS"

   العلامة: بادج مينا. قرص عنبر بحلقة حبر وسُمك مصمت مزاح (نفس ظل مفتاح
   الكاشير في الواجهة)، وجواه غطاء تقديم (cloche) بلون الحبر.

   القبّة **واطية وعريضة** (نصف محور 12.5×8.3) والمقبض صغير وقريب منها —
   ودي مش تفصيلة شكلية: القبّة العالية والمقبض الكبير بيتقروا "راس وكتافين"
   يعني أيقونة مستخدم، والواطية العريضة بتتقرا غطاء تقديم فوراً.
   القاعدة أعرض من القبّة عشان الشكل يقف مستقر.

   مفيش تدرّجات ولا لمعة ولا شفافية — ألوان مصمتة بس، فبيفضل مقروء من
   16px (التبويب) لحد 128px (شاشة الدخول)، وبيتطبع أبيض/أسود من غير فقد.

   المسارات نفسها جاية من `geometry.ts`، ونفس الملف بيولّد ملفات
   `public/` (favicon · PWA · og) عن طريق `npm run brand` —
   فمفيش نسختين للعلامة تفرقوا مع الوقت.
   ========================================================================== */

/**
 * نغمة العلامة:
 * - `brand`  على الورق الفاتح: قرص عنبر · حلقة وسُمك حبر.
 * - `onDark` على الأسطح الداكنة (الترويسة · الدخول): حلقة كريمي وسُمك نحاسي.
 * - `mono`   لون واحد موروث بـ `currentColor` — للأماكن اللي بتفرض لون.
 * - `print`  أسود على أبيض — الفاتورة الحرارية بتطبع أبيض/أسود بس.
 */
export type LogoTone = "brand" | "onDark" | "mono" | "print";

const TONES = {
  brand: { shadow: COLORS.ink, ring: COLORS.ink, disk: COLORS.amber, cloche: COLORS.ink },
  onDark: { shadow: COLORS.brass, ring: COLORS.cream, disk: COLORS.amber, cloche: COLORS.ink },
  print: { shadow: "#000", ring: "#000", disk: "#fff", cloche: "#000" },
} as const;

export function LogoMark({
  size = 40,
  tone = "brand",
  className,
}: {
  size?: number;
  tone?: LogoTone;
  className?: string;
}) {
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
      {tone === "mono" ? (
        <path d={MONO_PATH} fill="currentColor" fillRule="evenodd" />
      ) : (
        <>
          {/* السُمك المصمت: نفس القرص مزاح (3,3) */}
          <circle cx={DISK.cx + SHADOW.dx} cy={DISK.cy + SHADOW.dy} r={DISK.r + DISK.stroke / 2} fill={TONES[tone].shadow} />
          <circle
            cx={DISK.cx}
            cy={DISK.cy}
            r={DISK.r}
            fill={TONES[tone].disk}
            stroke={TONES[tone].ring}
            strokeWidth={DISK.stroke}
          />
          {/* غطاء التقديم: مقبض · قبّة · قاعدة — كلها مصمتة، مفيش strokes */}
          <g fill={TONES[tone].cloche}>
            <circle cx={KNOB.cx} cy={KNOB.cy} r={KNOB.r} />
            <path d={DOME} />
            <rect x={BAR.x} y={BAR.y} width={BAR.w} height={BAR.h} rx={BAR.r} />
          </g>
        </>
      )}
    </svg>
  );
}

/* --------------------------------- الاسم ---------------------------------- */

/**
 * الاسم المكتوب — نص HTML مش SVG، عشان يورث خط النظام وياخد
 * كل تحسينات الـ hinting على الشاشات العادية.
 *
 * التجميعة سطرين: **عنبر** بخط اللافتات، وتحته **AMBER POS** صغير ومتباعد
 * بخط الإيصال. العربي هو الاسم واللاتيني هو التوقيع — فمفيش تكرار لكلمة
 * "POS" في السطرين، والعين بتمسك اسم واحد بس.
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
 * `inline`  → الترويسة  ·  `stacked` → الدخول · الانتظار
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
  const markSize = { sm: 34, md: 44, lg: 84 }[size];

  return (
    <span
      className={`logo logo--${layout} logo--${size}${onDark ? " logo--ondark" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <LogoMark size={markSize} tone={onDark ? "onDark" : "brand"} />
      <span className="logo__text">
        <Wordmark size={size} onDark={onDark} />
        {tagline && <span className="logo__tagline">{BRAND.tagline}</span>}
      </span>
    </span>
  );
}
