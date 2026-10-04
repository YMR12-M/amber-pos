import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Stat({
  label,
  value,
  unit,
  icon,
  foot,
  accent,
  danger,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  foot?: ReactNode;
  /** لوحة عنبرية — المؤشر الأهم في الشاشة */
  accent?: boolean;
  /** لوحة حمرا — حاجة محتاجة تدخّل (طلبات متأخرة) */
  danger?: boolean;
}) {
  return (
    <div className={cn("stat", accent && "stat--accent", danger && "stat--danger")}>
      <div className="stat__label">
        {icon}
        {label}
      </div>
      <div className="stat__value">
        {value}
        {unit && <span className="stat__unit">{unit}</span>}
      </div>
      {foot && <div className="stat__foot">{foot}</div>}
    </div>
  );
}
