import type { ReactNode } from "react";

/**
 * اللوحة الجانبية الداكنة — سياقية حسب الشاشة
 * (سلة الطلب في الكاشير · ملخص الوردية · مؤشرات المطبخ).
 */
export function Sidebar({
  title,
  hint,
  action,
  children,
  footer,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <aside className="sidebar on-panel">
      <div className="sidebar__head">
        <div className="u-between">
          <div>
            <h2 className="sidebar__title">{title}</h2>
            {hint && <div className="sidebar__hint">{hint}</div>}
          </div>
          {action}
        </div>
      </div>

      <div className="sidebar__scroll">{children}</div>

      {footer && <div className="sidebar__foot">{footer}</div>}
    </aside>
  );
}

/** صف "بند: قيمة" داخل تذييل السايدبار. */
export function SummaryRow({
  label,
  value,
  total,
}: {
  label: ReactNode;
  value: ReactNode;
  total?: boolean;
}) {
  return (
    <div className={total ? "srow srow--total" : "srow"}>
      <span>{label}</span>
      <span className="srow__value">{value}</span>
    </div>
  );
}
