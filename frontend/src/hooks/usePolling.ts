import { useEffect, useRef } from "react";

/**
 * تحديث دوري بيوقف تلقائياً لما التبويب يبقى مخفي، وبيرجّع يحدّث فوراً
 * أول ما المستخدم يرجع. بيوفّر طلبات كتير على السيرفر وبطارية الجهاز.
 *
 * `immediate` بيخلي أول جلب يحصل عند التركيب — عشان الشاشة ما تستناش
 * دورة كاملة، ومن غير ما الصفحة تحتاج useEffect منفصل للجلب الأولي.
 */
export function usePolling(
  fn: () => void,
  intervalMs: number,
  { enabled = true, immediate = false }: { enabled?: boolean; immediate?: boolean } = {}
) {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    if (!enabled) return;

    let timer: number | undefined;

    const tick = () => {
      if (document.visibilityState === "visible") saved.current();
    };

    const start = () => {
      stop();
      timer = window.setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        saved.current(); // تحديث فوري عند الرجوع
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") {
      if (immediate) saved.current(); // أول جلب فوري بدل انتظار دورة كاملة
      start();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled, immediate]);
}
