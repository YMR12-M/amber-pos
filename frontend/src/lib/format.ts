/**
 * كل التنسيقات (فلوس · تواريخ · وقت) في مكان واحد.
 *
 * رمز العملة **مش** هنا — بيتظبط من لوحة التحكم وبيتقري من
 * `useSettings().currency`، فالنظام ينفع لأي سوق من غير تعديل كود.
 */

/**
 * كل الأرقام في النظام بالأرقام اللاتينية (0-9) حتى في النصوص العربية —
 * `-u-nu-latn` بيجبر التواريخ والساعة على نفس النظام، فمفيش خلط
 * بين "١٢" و"12" في نفس الشاشة.
 */
const AR = "ar-EG-u-nu-latn";

/**
 * يغلّف نص **تركيبه لاتيني** (تاريخ · تليفون · رقم ضريبي · مرجع فاتورة)
 * بعازل اتجاه: LRI … PDI (U+2066 … U+2069).
 *
 * من غيره خوارزمية الاتجاه ثنائي بتعيد ترتيب المجموعات جوّه الجملة
 * العربية: "0100 000 0000" بتتطبع "0000 000 0100"، و"02/09/2026"
 * بتبقى "2026/09/02". الحرفين عرضهم صفر — مالهمش أي أثر على التخطيط
 * ولا على الطول المطبوع.
 */
export const ltr = (text: string) => `\u2066${text}\u2069`;

/**
 * `Intl` بيحقن علامات اتجاه (U+200F RLM) بين مكوّنات التاريخ في اللغة
 * العربية — "01‏/09‏/2026". العلامات دي بتقلب ترتيب المجموعات حتى جوّه
 * عازل LTR، فالتاريخ بيتطبع "2026/09/01" على الفاتورة.
 * بنشيلها قبل ما نغلّف، فالمطبوع يطابق المكتوب.
 */
const stripMarks = (text: string) => text.replace(/[\u200e\u200f]/g, "");

const moneyFmt = new Intl.NumberFormat("en-EG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intFmt = new Intl.NumberFormat("en-EG");

/** 1234.5 → "1,234.50" */
export function money(value: string | number | null | undefined): string {
  return moneyFmt.format(Number(value) || 0);
}

export function int(value: string | number | null | undefined): string {
  return intFmt.format(Number(value) || 0);
}

/** MySQL DATETIME بيرجع "YYYY-MM-DD HH:mm:ss" بتوقيت UTC. */
export function parseServerDate(iso: string): Date {
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso.replace(" ", "T")}Z`);
}

/** الدقايق اللي فاتت من وقت معيّن — الرقم اللي يهم المطبخ. */
export function minutesSince(iso: string): number {
  const diff = Date.now() - parseServerDate(iso).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

/**
 * مدة الانتظار بصيغة يقراها الطباخ بسرعة:
 * 8 → "8 د" · 95 → "1 س 35 د" · 1500 → "يوم +"
 * (بنتجنب صيغة 1:35 لأنها بتتقري غلط كأنها ساعة حايط)
 */
export function humanDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} د`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} س` : `${h} س ${m} د`;
  }
  const days = Math.floor(minutes / 1440);
  return days === 1 ? "يوم +" : `${days} أيام +`;
}

const timeFmt = new Intl.DateTimeFormat(AR, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const dateFmt = new Intl.DateTimeFormat(AR, {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const stampFmt = new Intl.DateTimeFormat(AR, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export const formatTime = (d: Date) => ltr(stripMarks(timeFmt.format(d)));
export const formatDate = (d: Date) => dateFmt.format(d);
export const formatStamp = (iso: string) => ltr(stripMarks(stampFmt.format(parseServerDate(iso))));

/** "2026-08-24" → "24 أغسطس" (لتقارير المبيعات) */
export function formatDay(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  return new Intl.DateTimeFormat(AR, { day: "numeric", month: "short" }).format(d);
}

/** الحروف الأولى من الاسم للأفاتار */
export function initials(name: string | undefined): string {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
