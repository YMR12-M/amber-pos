import { useCallback, useEffect, useRef, useState } from "react";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

/**
 * جالب بيانات بسيط: بيتعامل مع التحميل والأخطاء ويمنع تحديث الحالة
 * بعد ما الكمبوننت يتشال (StrictMode-safe).
 */
export function useAsyncList<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: "" });
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setState((s) => ({ ...s, loading: true }));
      try {
        const data = await fetcher();
        if (alive.current) setState({ data, loading: false, error: "" });
        return data;
      } catch (err) {
        if (alive.current) {
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : "فشل تحميل البيانات",
          }));
        }
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: run, setData: (d: T) => setState((s) => ({ ...s, data: d })) };
}
