import { useState } from "react";
import type { RestaurantTable } from "../../../types";
import { Modal } from "../../../components/ui";
import { IconTable } from "../../../components/icons";
import { TableTile } from "./TableTile";

/**
 * اختيار الطاولة — زي الكاشير التقليدي: بتدوس على الطاولة في خريطة القاعة
 * بدل ما تفتح قايمة منسدلة. المتاحة بس هي اللي بتتضغط.
 * دوس على الطاولة المختارة تاني عشان تشيلها.
 */
export function TablePicker({
  tables,
  value,
  onChange,
}: {
  tables: RestaurantTable[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = tables.find((t) => t.id === value) ?? null;
  const freeCount = tables.filter((t) => t.status === "free").length;

  return (
    <>
      <button
        type="button"
        className="tablepick"
        data-empty={selected ? undefined : true}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className="tablepick__icon" aria-hidden="true">
          <IconTable size={22} />
        </span>
        <span className="tablepick__text">
          <span className="tablepick__label">الطاولة</span>
          <span className="tablepick__value">{selected ? selected.label : "اختر الطاولة"}</span>
        </span>
        <span className="tablepick__hint num">
          {selected ? "تغيير" : `${freeCount} متاحة`}
        </span>
      </button>

      {tables.length === 0 && (
        <span className="field__hint">مفيش طاولات مسجّلة — ضيفها من لوحة التحكم</span>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="اختر الطاولة"
        icon={<IconTable size={22} />}
        wide
      >
        <div className="grid-tiles grid-tiles--picker">
          {tables.map((t) => (
            <TableTile
              key={t.id}
              table={t}
              mode="pick"
              selected={t.id === value}
              onPick={(table) => {
                onChange(table.id === value ? null : table.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </Modal>
    </>
  );
}
