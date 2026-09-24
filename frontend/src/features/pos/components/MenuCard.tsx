import { memo } from "react";
import type { MenuItem } from "../../../types";
import { money } from "../../../lib/format";
import { useSettings } from "../../../context/SettingsContext";
import { IconPlus } from "../../../components/icons";

/**
 * كرت الصنف. memo لأن شبكة المنيو ممكن توصل لمئات الكروت،
 * ومش عايزين إعادة رسم كاملة مع كل ضغطة في السلة.
 */
export const MenuCard = memo(function MenuCard({
  item,
  qty,
  onAdd,
}: {
  item: MenuItem;
  qty: number;
  onAdd: (item: MenuItem) => void;
}) {
  const { currency } = useSettings();
  const available = Boolean(item.is_available);

  return (
    <button
      type="button"
      className="menucard"
      disabled={!available}
      onClick={() => onAdd(item)}
      aria-label={`إضافة ${item.name}`}
    >
      {qty > 0 && <span className="menucard__qty">{qty}</span>}

      <span className="menucard__name">{item.name}</span>
      {item.description && <span className="menucard__desc u-clamp-2">{item.description}</span>}

      <span className="menucard__foot">
        <span className="menucard__price">
          {money(item.price)} <span className="menucard__cur">{currency}</span>
        </span>
        {available && (
          <span className="menucard__add" aria-hidden="true">
            <IconPlus size={18} />
          </span>
        )}
      </span>
    </button>
  );
});
