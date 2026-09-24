import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** إجباري — الزر أيقونة بس، فمحتاج اسم يقراه القارئ الصوتي. */
  label: string;
  variant?: "default" | "plain" | "onpanel";
  icon: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = "default", className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      className={cn("iconbtn", variant !== "default" && `iconbtn--${variant}`, className)}
      {...rest}
    >
      {icon}
    </button>
  );
});
