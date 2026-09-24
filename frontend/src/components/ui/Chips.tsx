import { cn } from "../../lib/cn";
import { useRovingFocus } from "../../hooks/useRovingFocus";

export interface ChipOption<T> {
  value: T;
  label: string;
  count?: number;
}

/**
 * صف فلاتر أفقي قابل للتمرير — اختيار واحد، فدلالياً `radiogroup`.
 * الأسهم بتنقّل بين الفلاتر و Home/End بيروحوا للطرفين.
 */
export function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
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
      className={cn("chiprow", className)}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.count !== undefined ? `${o.label} — ${o.count}` : o.label}
            tabIndex={selected ? 0 : -1}
            className={cn("chip", selected && "is-active")}
            onClick={() => onChange(o.value)}
          >
            {o.label}
            {o.count !== undefined && (
              <span className="chip__count" aria-hidden="true">
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
