import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: boolean;
  flush?: boolean;
  interactive?: boolean;
}

export function Card({ pad, flush, interactive, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "card",
        pad && "card--pad",
        flush && "card--flush",
        interactive && "card--interactive",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHead({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="card__head">
      <h3 className="card__title">{title}</h3>
      {action}
    </div>
  );
}
