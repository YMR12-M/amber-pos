import { useEffect, useState } from "react";

/** ساعة حيّة بتحدّث كل ثانية — بتتوقف لما التبويب يتخفي. */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: number | undefined;

    const start = () => {
      stop();
      timer = window.setInterval(() => setNow(new Date()), 1000);
    };
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setNow(new Date());
        start();
      } else stop();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return now;
}
