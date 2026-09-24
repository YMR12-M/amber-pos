import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import { IconButton } from "./IconButton";
import { IconClose } from "../icons";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  icon?: ReactNode;
  iconTone?: "success" | "danger" | "accent";
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  /** يمنع القفل بـ Esc أو الضغط برّه (للعمليات اللي لازم تتأكد) */
  persistent?: boolean;
}

/** العناصر اللي ينفع تاخد فوكس جوه المودال. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  icon,
  iconTone = "accent",
  wide,
  children,
  footer,
  persistent,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const focusable = useCallback(
    () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0
      ),
    []
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;

    // الفوكس الأولي: أول حقل مطلوب، وإلا أول عنصر، وإلا اللوحة نفسها
    const first =
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? focusable()[0];
    (first ?? panelRef.current)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !persistent) {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      // حبس الفوكس: Tab بيلف جوه المودال بس
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === firstEl || !panelRef.current?.contains(active))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (active === lastEl || !panelRef.current?.contains(active))) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);

      // رجوع الفوكس لمكانه. لو العنصر اللي فتح المودال اتشال من الصفحة
      // (زي زر دفع طلب خرج من القائمة) الفوكس كان هيقع على <body> —
      // فبنرجّعه للمنطقة الرئيسية بدل ما المستخدم يضيع مكانه.
      if (previous && document.contains(previous)) {
        previous.focus();
      } else {
        const main = document.getElementById("main");
        if (main) {
          main.setAttribute("tabindex", "-1");
          main.focus();
        }
      }
    };
  }, [open, onClose, persistent, focusable]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal__backdrop"
      onMouseDown={(e) => {
        if (!persistent && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={cn("modal", wide && "modal--wide")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {(title || icon) && (
          <div className="modal__head">
            {icon && (
              <div className={`modal__icon modal__icon--${iconTone}`} aria-hidden="true">
                {icon}
              </div>
            )}
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            {!persistent && (
              <IconButton
                label="إغلاق"
                variant="plain"
                icon={<IconClose size={20} />}
                onClick={onClose}
              />
            )}
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
