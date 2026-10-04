import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { IconInbox } from "../icons";

/** حالة "مفيش بيانات" — بدل الصفحة الفاضية. */
export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon ?? <IconInbox size={32} />}</div>
      <div className="empty__title">{title}</div>
      {text && <p className="empty__text">{text}</p>}
      {action}
    </div>
  );
}

export function Skeleton({
  h = 16,
  w = "100%",
  r,
  className,
}: {
  h?: number | string;
  w?: number | string;
  r?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("skeleton", className)}
      style={{ height: h, width: w, borderRadius: r }}
      aria-hidden="true"
    />
  );
}

/** شبكة كروت وهمية أثناء التحميل — بتمنع "قفزة" المحتوى. */
export function SkeletonGrid({
  count = 8,
  height = 124,
  className = "grid-menu",
}: {
  count?: number;
  height?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} h={height} r={5} />
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <div className={cn("spinner", className)} role="status" aria-label="جاري التحميل" />;
}

export function ErrorLine({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="badge badge--cancelled" style={{ alignSelf: "flex-start" }}>
      {message}
    </div>
  );
}
