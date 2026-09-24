import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Field";
import { IconAlert, IconKey } from "../icons";

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PromptOptions {
  title: string;
  message?: ReactNode;
  label?: string;
  placeholder?: string;
  /** القيمة المبدئية — لإعادة التسمية: الاسم الحالي بيتعرض جاهز للتعديل. */
  defaultValue?: string;
  type?: "text" | "password" | "number";
  minLength?: number;
  confirmLabel?: string;
}

interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const DialogCtx = createContext<DialogApi | null>(null);

type Pending =
  | { kind: "confirm"; options: ConfirmOptions }
  | { kind: "prompt"; options: PromptOptions }
  | null;

/**
 * بديل window.confirm / window.prompt بواجهة على هوية النظام.
 * بيرجّع Promise عشان الاستخدام يفضل بسيط: `if (await confirm({...}))`
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending>(null);
  const [value, setValue] = useState("");
  const resolver = useRef<((v: never) => void) | null>(null);

  const close = useCallback((result: boolean | string | null) => {
    resolver.current?.(result as never);
    resolver.current = null;
    setPending(null);
    setValue("");
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          resolver.current = resolve as (v: never) => void;
          setPending({ kind: "confirm", options });
        }),
      prompt: (options) =>
        new Promise<string | null>((resolve) => {
          resolver.current = resolve as (v: never) => void;
          setValue(options.defaultValue ?? "");
          setPending({ kind: "prompt", options });
        }),
    }),
    []
  );

  const isPrompt = pending?.kind === "prompt";
  const opts = pending?.options;
  const danger = pending?.kind === "confirm" && pending.options.danger;
  const tooShort =
    isPrompt && pending.options.minLength ? value.trim().length < pending.options.minLength : false;

  return (
    <DialogCtx.Provider value={api}>
      {children}
      <Modal
        open={pending !== null}
        onClose={() => close(isPrompt ? null : false)}
        title={opts?.title}
        icon={isPrompt ? <IconKey size={22} /> : <IconAlert size={22} />}
        iconTone={danger ? "danger" : "accent"}
        footer={
          <>
            <Button variant="soft" onClick={() => close(isPrompt ? null : false)}>
              {(!isPrompt && (opts as ConfirmOptions | undefined)?.cancelLabel) || "إلغاء"}
            </Button>
            <Button
              variant={danger ? "danger" : "primary"}
              disabled={isPrompt && (value.trim() === "" || tooShort)}
              onClick={() => close(isPrompt ? value.trim() : true)}
            >
              {opts?.confirmLabel || (isPrompt ? "حفظ" : "تأكيد")}
            </Button>
          </>
        }
      >
        {opts?.message && (
          <p style={{ color: "var(--text-soft)", fontWeight: 600 }}>{opts.message}</p>
        )}
        {isPrompt && (
          <div style={{ marginTop: 12 }}>
            <Input
              data-autofocus
              autoFocus
              type={pending.options.type ?? "text"}
              label={pending.options.label}
              placeholder={pending.options.placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && value.trim() && !tooShort) close(value.trim());
              }}
              hint={
                pending.options.minLength
                  ? `${pending.options.minLength} حروف على الأقل`
                  : undefined
              }
            />
          </div>
        )}
      </Modal>
    </DialogCtx.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogCtx);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}
