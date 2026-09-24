import { useCallback } from "react";

/**
 * تنقّل بالأسهم داخل مجموعة أزرار (دوك · مجزّأ · شرائح).
 * السهم بيحرّك الفوكس ويختار، و Home/End بيروحوا للطرفين.
 * بيقلب اتجاه الأسهم تلقائياً في RTL.
 */
export function useRovingFocus<T extends { id?: string }>(
  count: number,
  index: number,
  onPick: (next: number) => void
) {
  return useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
      let next: number | null = null;

      if (e.key === "ArrowRight") next = index + (rtl ? -1 : 1);
      else if (e.key === "ArrowLeft") next = index + (rtl ? 1 : -1);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = count - 1;
      else return;

      e.preventDefault();
      const clamped = ((next % count) + count) % count;
      onPick(clamped);

      // نقل الفوكس للزر الجديد جوه نفس الحاوية
      const buttons = e.currentTarget.querySelectorAll<HTMLElement>("button");
      buttons[clamped]?.focus();
    },
    [count, index, onPick]
  );
}
