import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import type { OrderStatus } from "../../types";
import { ORDER_STATUS_LABELS } from "../../types";

type Tone =
  | "neutral"
  | "accent"
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "paid"
  | "cancelled";

export function Badge({
  tone = "neutral",
  dot,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("badge", `badge--${tone}`, className)}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  );
}

/** شارة حالة الطلب — اللون والنص متولّدين من الحالة نفسها. */
export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={status} dot>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
