import type { Category } from "../../../types";
import { hueOf } from "../../../lib/hue";
import { useRovingFocus } from "../../../hooks/useRovingFocus";
import { CategoryGlyph } from "../../../components/icons/glyphs";
import { IconGrid } from "../../../components/icons";

export type CategoryValue = number | "all";

interface Option {
  value: CategoryValue;
  label: string;
  count: number;
  hue: number;
}

/**
 * عمود الأقسام — مفاتيح ملوّنة على جنب المنيو، زي فواصل الدفتر.
 *
 * عمودي مش أفقي عن قصد: التابلت أفقي، والارتفاع هو اللي بيضيق مش العرض،
 * والعمود بيسكرول لوحده لو الأقسام كترت — مفيش سكرول أفقي مخفي.
 * اختيار قيمة واحدة، فدلالياً `radiogroup`؛ الأسهم بتنقّل بين الأقسام.
 */
export function CategoryRail({
  categories,
  counts,
  total,
  value,
  onChange,
}: {
  categories: Category[];
  counts: Map<number, number>;
  total: number;
  value: CategoryValue;
  onChange: (value: CategoryValue) => void;
}) {
  const options: Option[] = [
    { value: "all", label: "الكل", count: total, hue: 0 },
    ...categories.map((c) => ({
      value: c.id,
      label: c.name,
      count: counts.get(c.id) ?? 0,
      hue: hueOf(c.id),
    })),
  ];

  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const onKeyDown = useRovingFocus(options.length, index, (next) => onChange(options[next].value));

  return (
    <div className="pos__rail" role="radiogroup" aria-label="أقسام المنيو" onKeyDown={onKeyDown}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${o.label} — ${o.count}`}
            // roving tabindex: عنصر واحد بس في مسار الـ Tab
            tabIndex={selected ? 0 : -1}
            data-hue={o.hue}
            className="railkey"
            onClick={() => onChange(o.value)}
          >
            <span className="railkey__glyph">
              {o.value === "all" ? <IconGrid size={24} /> : <CategoryGlyph name={o.label} />}
            </span>
            <span className="railkey__text">
              <span className="railkey__name">{o.label}</span>
              <span className="railkey__count num" aria-hidden="true">
                {o.count} صنف
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
