import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { IconAlert, IconCheckCircle, IconInfo } from "../icons";
import { UnauthorizedError } from "../../api";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
  /** يشيل رسالة الخطأ من أي Error ويعرضها */
  fromError: (err: unknown, fallback?: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

const ICONS: Record<ToastKind, ReactNode> = {
  success: <IconCheckCircle size={20} />,
  error: <IconAlert size={20} />,
  info: <IconInfo size={20} />,
};

const DURATION = 3600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Set<number>());

  // كل مؤقّت بيتلغي عند التفكيك — مفيش setState على كمبوننت متشال
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(window.clearTimeout);
      pending.clear();
    };
  }, []);

  const push = useCallback((kind: ToastKind, text: string) => {
    const id = ++seq.current;
    setItems((list) => [...list.slice(-3), { id, kind, text }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setItems((list) => list.filter((t) => t.id !== id));
    }, DURATION);
    timers.current.add(timer);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (t) => push("success", t),
      error: (t) => push("error", t),
      info: (t) => push("info", t),
      fromError: (err, fallback = "حصل خطأ، حاول تاني") => {
        // انتهاء الجلسة بتتصرّف فيه طبقة الجلسة (بترجّع لشاشة الدخول).
        // من غير الاستثناء ده، أي شاشة فيها كذا نداء كانت بتطلّع كومة
        // توستات فوق بعض وهي بتخرج.
        if (err instanceof UnauthorizedError) return;
        push("error", err instanceof Error ? err.message : fallback);
      },
    }),
    [push]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div className="toaster" role="status" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className={`toast toast--${t.kind}`}>
              <span className="toast__icon">{ICONS[t.kind]}</span>
              <span className="toast__text">{t.text}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
