import type { ReactNode } from "react";

/* ============================================================================
   رموز الأقسام — رسومات صغيرة بأسلوب ملصق المينا: حدود حبر + تعبئة بلون القسم.
   دي مش أيقونات واجهة (اللي في index.tsx) — دي رسومات بتساعد الكاشير يلاقي
   القسم بنظرة من غير ما يقرا، زي رموز لافتة المنيو.

   الألوان من CSS مش من الكود: `.glyph` بيحدّد `--glyph-fill` و `--glyph-line`،
   فالرمز بيقلب ألوانه لوحده لما القسم يتفعّل (راجع features.css).
   ========================================================================== */

export type GlyphKey =
  | "coffee"
  | "tea"
  | "cold"
  | "breakfast"
  | "sandwich"
  | "main"
  | "dessert"
  | "salad"
  | "extras"
  | "tag";

/** تطبيع العربي للمقارنة: بيشيل التشكيل ويوحّد أشكال الألف والياء والتاء المربوطة. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

/**
 * الترتيب مهم: الأخص قبل الأعم.
 * ("ايس كريم" لازم يتقابل مع الحلويات قبل ما "ايس" تاخده للمشروبات الباردة)
 */
const RULES: [GlyphKey, string[]][] = [
  ["extras", ["اضاف", "extra", "topping", "جانبي", "صوص"]],
  ["dessert", ["حلو", "كيك", "كنافه", "بسبوسه", "تشيز", "ايس كريم", "جيلاتي", "وافل", "كوكيز", "براوني", "dessert", "cake", "sweet", "waffle", "ice cream", "cookie"]],
  ["salad", ["سلط", "salad", "خضار"]],
  ["breakfast", ["فطور", "فطار", "افطار", "بيض", "فول", "طعمي", "فلافل", "شكشوك", "عجه", "فطير", "breakfast", "brunch", "egg"]],
  ["sandwich", ["ساندو", "ساندي", "سندو", "سندي", "سناك", "برجر", "همبرجر", "هوت دوج", "شاورما", "حواوشي", "كريب", "وجبات سريعه", "burger", "sandwich", "wrap", "snack"]],
  ["tea", ["شاي", "اعشاب", "عشبي", "ينسون", "نعناع", "كركديه", "حلبه", "سحلب", "tea", "herbal", "chai"]],
  ["coffee", ["قهو", "كوفي", "اسبريسو", "كابتشينو", "كابوتشينو", "لاتيه", "موكا", "نسكافيه", "امريكانو", "ساخن", "coffee", "espresso", "latte", "cappuc", "mocha", "americano", "hot"]],
  ["cold", ["بارد", "مثلج", "عصير", "عصاير", "ايس", "ميلك", "شيك", "سموذي", "سموزي", "كوكتيل", "موهيتو", "ليمون", "مشروب", "صودا", "juice", "iced", "cold", "smoothie", "shake", "mojito", "soda", "drink"]],
  ["main", ["طبق", "اطباق", "رئيسي", "مشويات", "مشوي", "وجبه", "وجبات", "غداء", "عشاء", "مكرونه", "باستا", "ريزوتو", "بيتزا", "لحوم", "فراخ", "دجاج", "سمك", "اسماك", "ماكولات", "main", "grill", "dish", "pasta", "pizza", "steak", "meal", "dinner", "lunch"]],
];

/** الرمز المناسب لاسم القسم — بيرجع `tag` (علامة سعر) لو الاسم مش معروف. */
export function glyphFor(name: string): GlyphKey {
  const n = normalize(name);
  for (const [key, words] of RULES) {
    if (words.some((w) => n.includes(w))) return key;
  }
  return "tag";
}

const DRAWINGS: Record<GlyphKey, ReactNode> = {
  coffee: (
    <>
      <path className="g-fill g-line" d="M6 13h17v5.5a7.5 7.5 0 0 1-7.5 7.5h-2A7.5 7.5 0 0 1 6 18.5z" />
      <path className="g-line" d="M23 15.2h1.6a3.4 3.4 0 0 1 0 6.8h-2.2" />
      <path className="g-line" d="M3.5 28.5h22" />
      <path className="g-line g-thin" d="M10.5 9.5c-1.4-1.5 1.4-2.8 0-4.5M15 9.5c-1.4-1.5 1.4-2.8 0-4.5M19.5 9.5c-1.4-1.5 1.4-2.8 0-4.5" />
    </>
  ),
  tea: (
    <>
      <path className="g-line" d="M9 8h14l-1.6 17.4a2 2 0 0 1-2 1.8h-6.8a2 2 0 0 1-2-1.8z" />
      <path className="g-fill" d="M9.9 13h12.2l-1.1 12.2a1.2 1.2 0 0 1-1.2 1.1h-7.6a1.2 1.2 0 0 1-1.2-1.1z" />
      <path className="g-line" d="M5.5 28.8h21" />
      <path className="g-line g-thin" d="M20.6 4.4l-3.4 8.8" />
      <ellipse className="g-fill g-line g-thin" cx="21" cy="3.7" rx="1.6" ry="1.1" transform="rotate(20 21 3.7)" />
    </>
  ),
  cold: (
    <>
      <path className="g-line" d="M8.5 9.5h15l-1.9 16.6a2 2 0 0 1-2 1.8h-7.2a2 2 0 0 1-2-1.8z" />
      <path className="g-fill" d="M9.4 15h13.2l-1.3 11.1a1.1 1.1 0 0 1-1.1 1h-8.4a1.1 1.1 0 0 1-1.1-1z" />
      <path className="g-line" d="M19.5 3.6l-2.4 9.9M19.5 3.6h3" />
      <rect className="g-white g-line g-thin" x="11.6" y="17.2" width="4.6" height="4.6" rx="1" transform="rotate(-12 13.9 19.5)" />
      <rect className="g-white g-line g-thin" x="16.2" y="20.6" width="4.6" height="4.6" rx="1" transform="rotate(10 18.5 22.9)" />
    </>
  ),
  breakfast: (
    <>
      <path className="g-white g-line" d="M5.5 16.5C5 10.5 10.5 6.2 16.8 7c4.4.6 6.2 3.4 8.6 5.3 3.4 2.7 2.5 8-.6 10.8-3.4 3-9 3.6-13.2 2.4C7.4 24.2 5.8 21 5.5 16.5z" />
      <circle className="g-fill g-line" cx="15" cy="16.5" r="4.8" />
      <path className="g-line g-thin" d="M12.8 14.8a3 3 0 0 1 2-1" />
    </>
  ),
  sandwich: (
    <>
      <path className="g-fill g-line" d="M5 14.5a11 8.5 0 0 1 22 0z" />
      <path className="g-line g-thin" d="M11 10.6l1.2.8M16 9.3v1.4M21 10.6l-1.2.8" />
      <path className="g-white g-line" d="M4.5 17.5q1.9 2 3.8 0t3.8 0 3.8 0 3.8 0 3.8 0" />
      <rect className="g-solid" x="5" y="20.3" width="22" height="3.6" rx="1.8" />
      <path className="g-fill g-line" d="M5 25.8h22v.9a2.8 2.8 0 0 1-2.8 2.8H7.8A2.8 2.8 0 0 1 5 26.7z" />
    </>
  ),
  main: (
    <>
      <path className="g-fill g-line" d="M4.5 22.5a11.5 9 0 0 1 23 0z" />
      <circle className="g-solid" cx="16" cy="10" r="1.9" />
      <path className="g-line" d="M2.5 25.8h27" />
      <path className="g-line g-thin" d="M9 18a7.5 5 0 0 1 4-3.4" />
    </>
  ),
  dessert: (
    <>
      <path className="g-white g-line" d="M5 13.5h22v12.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
      <path className="g-fill g-line" d="M5 13.5h22v4.2q-2.2 4.8-4.4 0q-2.2 4.8-4.4 0q-2.2 4.8-4.4 0q-2.2 4.8-4.4 0q-2.2 4.8-4.4 0z" />
      <path className="g-line g-thin" d="M5 24h22" />
      <circle className="g-solid" cx="16" cy="9.6" r="3" />
      <path className="g-line g-thin" d="M16 6.8c.4-1.8 1.8-2.8 3.6-2.9" />
    </>
  ),
  salad: (
    <>
      <path className="g-white g-line" d="M8.5 16.5c-1.4-5 1.6-9 7-9 .8 5-1.8 8.6-7 9z" />
      <path className="g-white g-line" d="M16.5 16.5c-.4-5.6 2.8-9 8.4-8.4.6 5-2.2 8.2-8.4 8.4z" />
      <path className="g-line g-thin" d="M10 14.5l3.2-3.5" />
      <path className="g-fill g-line" d="M3.5 17h25a12.5 11 0 0 1-25 0z" />
    </>
  ),
  extras: (
    <>
      <circle className="g-fill" cx="16" cy="16" r="9.5" />
      <circle className="g-line g-dash" cx="16" cy="16" r="11.8" />
      <path className="g-line" d="M16 10.8v10.4M10.8 16h10.4" />
    </>
  ),
  tag: (
    <>
      <path className="g-fill g-line" d="M4.5 16.5V7a2.5 2.5 0 0 1 2.5-2.5h9.5L27.8 15.8a2.5 2.5 0 0 1 0 3.5l-8.6 8.6a2.5 2.5 0 0 1-3.5 0z" />
      <circle className="g-white g-line g-thin" cx="10.2" cy="10.2" r="1.9" />
    </>
  ),
};

/** رمز القسم — حسب اسمه. زخرفي دايماً (`aria-hidden`): الاسم المكتوب جنبه. */
export function CategoryGlyph({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <svg
      className="glyph"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      {DRAWINGS[glyphFor(name)]}
    </svg>
  );
}
