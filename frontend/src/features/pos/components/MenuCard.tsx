import { memo } from "react";
import type { MenuItem } from "../../../types";
import { money } from "../../../lib/format";
import { useSettings } from "../../../context/SettingsContext";

/**
 * مفتاح الصنف — لافتة سعر: شريط بلون القسم على الطرف، الاسم بخط اللافتات،
 * والسعر بخط الإيصال. بيتضغط زي مفتاح كاشير حقيقي.
 *
 * memo لأن شبكة المنيو ممكن توصل لمئات المفاتيح، ومش عايزين إعادة رسم
 * كاملة مع كل ضغطة في السلة.
 */
export const MenuCard = memo(function MenuCard({
  item,
  hue,
  qty,
  onAdd,
}: {
  item: MenuItem;
  hue: number;
  qty: number;
  onAdd: (item: MenuItem) => void;
}) {
  const { currency } = useSettings();
  const available = Boolean(item.is_available);

  return (
    <button
      type="button"
      className="menucard"
      data-hue={hue}
      data-selected={qty > 0 || undefined}
      disabled={!available}
      onClick={() => onAdd(item)}
      aria-label={`إضافة ${item.name}`}
    >
      {qty > 0 && <span className="menucard__qty num">{qty}</span>}
      {!available && <span className="menucard__off">غير متاح</span>}

      <span className="menucard__name">{item.name}</span>
      {item.description && <span className="menucard__desc u-clamp-2">{item.description}</span>}

      <span className="menucard__price num">
        {money(item.price)}
        <span className="menucard__cur">{currency}</span>
      </span>
    </button>
  );
});
