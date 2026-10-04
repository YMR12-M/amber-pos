import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * لوحة الشيك — اللوحة الجانبية السياقية: سلة الطلب في الكاشير،
 * وملخص الوردية في تبويباته التانية. شكلها ورقة شيك على بلوك الكاشير:
 * ورق فاتح · سطور دفتر · هامش أحمر · فواصل متقطّعة.
 */
export function Ticket({
  title,
  hint,
  action,
  controls,
  children,
  footer,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  /** أدوات ثابتة تحت العنوان (نوع الطلب · الطاولة) — مش بتسكرول مع البنود. */
  controls?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn("ticket", className)}>
      <div className="ticket__head">
        <div>
          <h2 className="ticket__title">{title}</h2>
          {hint && <div className="ticket__hint">{hint}</div>}
        </div>
        {action}
      </div>

      {controls && <div className="ticket__controls">{controls}</div>}

      <div className="ticket__body">{children}</div>

      {footer && <div className="ticket__foot">{footer}</div>}
    </aside>
  );
}

/** صف حساب بخط منقّط: «بند ........ قيمة» — زي سطر الإيصال تماماً. */
export function TicketRow({
  label,
  value,
  total,
}: {
  label: ReactNode;
  value: ReactNode;
  total?: boolean;
}) {
  return (
    <div className={cn("trow", total && "trow--total")}>
      <span>{label}</span>
      <span className="trow__dots" aria-hidden="true" />
      <span className="trow__value">{value}</span>
    </div>
  );
}
