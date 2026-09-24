import { memo, useState } from "react";
import type { OrderType, RestaurantTable } from "../../../types";
import { ORDER_TYPE_LABELS } from "../../../types";
import { ORDER_TYPES } from "../../../lib/roles";
import { money } from "../../../lib/format";
import { useSettings } from "../../../context/SettingsContext";
import { Sidebar, SummaryRow } from "../../../components/layout";
import { Button, Input, Segmented, Select } from "../../../components/ui";
import {
  IconBag,
  IconBike,
  IconEdit,
  IconMinus,
  IconPlus,
  IconTable,
  IconTrash,
} from "../../../components/icons";
import type { CartLine } from "../useCart";

const TYPE_ICONS: Record<OrderType, JSX.Element> = {
  dine_in: <IconTable size={16} />,
  takeaway: <IconBag size={16} />,
  delivery: <IconBike size={16} />,
};

const CartRow = memo(function CartRow({
  line,
  onChangeQty,
  onRemove,
  onNotes,
}: {
  line: CartLine;
  onChangeQty: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onNotes: (id: number, notes: string) => void;
}) {
  // الحقل بيتفتح عند الطلب بس — السلة بتفضل مقروءة بنظرة واحدة،
  // والملاحظة استثناء مش القاعدة.
  const [open, setOpen] = useState(Boolean(line.notes));

  return (
    <div className="cartline">
      <div className="cartline__top">
        <span className="cartline__name">{line.name}</span>
        <button
          type="button"
          className="stepper__btn stepper__btn--danger"
          aria-label={`حذف ${line.name}`}
          onClick={() => onRemove(line.menu_item_id)}
        >
          <IconTrash size={15} />
        </button>
      </div>

      <div className="cartline__bottom">
        <div className="stepper">
          <button
            type="button"
            className="stepper__btn"
            aria-label="تقليل الكمية"
            onClick={() => onChangeQty(line.menu_item_id, -1)}
          >
            <IconMinus size={16} />
          </button>
          <span className="stepper__value">{line.quantity}</span>
          <button
            type="button"
            className="stepper__btn"
            aria-label="زيادة الكمية"
            onClick={() => onChangeQty(line.menu_item_id, 1)}
          >
            <IconPlus size={16} />
          </button>
        </div>

        <div style={{ textAlign: "end" }}>
          <div className="cartline__meta" dir="ltr">
            {line.quantity} × {money(line.price)}
          </div>
          <div className="cartline__sum">{money(line.price * line.quantity)}</div>
        </div>
      </div>

      {open ? (
        <input
          className="input cartline__note"
          autoFocus={!line.notes}
          placeholder="ملاحظة للمطبخ…"
          aria-label={`ملاحظة ${line.name}`}
          maxLength={255}
          value={line.notes ?? ""}
          onChange={(e) => onNotes(line.menu_item_id, e.target.value)}
          onBlur={() => {
            if (!line.notes) setOpen(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="cartline__note-btn"
          onClick={() => setOpen(true)}
        >
          <IconEdit size={13} />
          ملاحظة للمطبخ
        </button>
      )}
    </div>
  );
});

export interface CartPanelProps {
  lines: CartLine[];
  subtotal: number;
  total: number;
  discount: string;
  discountTooBig: boolean;
  count: number;
  orderType: OrderType;
  tables: RestaurantTable[];
  selectedTable: number | null;
  placing: boolean;
  canSubmit: boolean;
  onOrderType: (t: OrderType) => void;
  onSelectTable: (id: number | null) => void;
  onDiscount: (v: string) => void;
  onChangeQty: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onNotes: (id: number, notes: string) => void;
  onClear: () => void;
  onSubmit: () => void;
}

/** سلة الطلب — اللوحة الجانبية في شاشة الكاشير. */
export function CartPanel(p: CartPanelProps) {
  const { currency } = useSettings();

  return (
    <Sidebar
      title="الطلب الحالي"
      hint={p.count > 0 ? `${p.count} صنف في السلة` : "ابدأ بإضافة أصناف من المنيو"}
      action={
        p.lines.length > 0 ? (
          <Button size="sm" variant="onpanel" icon={<IconTrash size={15} />} onClick={p.onClear}>
            تفريغ
          </Button>
        ) : undefined
      }
      footer={
        <>
          <Input
            label={`خصم (${currency})`}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={p.discount}
            onChange={(e) => p.onDiscount(e.target.value)}
            error={p.discountTooBig ? "الخصم أكبر من إجمالي الطلب" : undefined}
          />

          <div>
            <SummaryRow label="المجموع" value={money(p.subtotal)} />
            {p.discount && !p.discountTooBig && Number(p.discount) > 0 && (
              <SummaryRow label="الخصم" value={`− ${money(p.discount)}`} />
            )}
            <SummaryRow
              total
              label={<span style={{ fontWeight: 800 }}>الإجمالي</span>}
              value={<span className="total-amount">{money(p.total)}</span>}
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            block
            loading={p.placing}
            disabled={!p.canSubmit}
            onClick={p.onSubmit}
          >
            {p.placing ? "جاري الإرسال…" : "إرسال الطلب للمطبخ"}
          </Button>
        </>
      }
    >
      <Segmented
        fill
        label="نوع الطلب"
        value={p.orderType}
        onChange={p.onOrderType}
        options={ORDER_TYPES.map((t) => ({
          value: t,
          srLabel: ORDER_TYPE_LABELS[t],
          label: (
            <span className="u-row" style={{ justifyContent: "center" }}>
              {TYPE_ICONS[t]}
              {ORDER_TYPE_LABELS[t]}
            </span>
          ),
        }))}
      />

      {p.orderType === "dine_in" && (
        <Select
          label="الطاولة"
          hint={p.tables.length === 0 ? "مفيش طاولات مسجّلة — ضيفها من لوحة التحكم" : undefined}
          value={p.selectedTable ?? ""}
          onChange={(e) => p.onSelectTable(Number(e.target.value) || null)}
        >
          <option value="">اختر الطاولة</option>
          {p.tables.map((t) => (
            <option key={t.id} value={t.id} disabled={t.status !== "free"}>
              {t.label}
              {t.status !== "free" ? " — مشغولة" : ""}
            </option>
          ))}
        </Select>
      )}

      {p.lines.length === 0 ? (
        <div
          className="u-col"
          style={{ alignItems: "center", gap: 10, padding: "32px 0", textAlign: "center" }}
        >
          <IconBag size={34} style={{ opacity: 0.35 }} />
          <span style={{ fontSize: "var(--fs-sm)", color: "var(--panel-text-soft)" }}>
            لسه مفيش أصناف مضافة
          </span>
        </div>
      ) : (
        p.lines.map((line) => (
          <CartRow
            key={line.menu_item_id}
            line={line}
            onChangeQty={p.onChangeQty}
            onRemove={p.onRemove}
            onNotes={p.onNotes}
          />
        ))
      )}
    </Sidebar>
  );
}
