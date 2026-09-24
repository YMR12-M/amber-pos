import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useRovingFocus } from "../../hooks/useRovingFocus";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** اسم نصّي للقارئ الصوتي لما يكون الـ label أيقونة + نص */
  srLabel?: string;
}

/**
 * اختيار واحد من مجموعة — دلالياً `radiogroup` مش `tablist`،
 * لأنه بيغيّر قيمة مش بيفتح لوحة محتوى.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  fill,
  label,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  fill?: boolean;
  /** اسم المجموعة للقارئ الصوتي */
  label: string;
  className?: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const onKeyDown = useRovingFocus(options.length, index, (next) =>
    onChange(options[next].value)
  );

  return (
    <div
      className={cn("segmented", fill && "segmented--fill", className)}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.srLabel}
            // roving tabindex: عنصر واحد بس في مسار الـ Tab
            tabIndex={selected ? 0 : -1}
            className={cn("segmented__btn", selected && "is-active")}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
