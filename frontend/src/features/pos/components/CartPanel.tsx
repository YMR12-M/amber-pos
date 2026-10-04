import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { OrderType, RestaurantTable } from "../../../types";
import { ORDER_TYPE_LABELS } from "../../../types";
import { ORDER_TYPES } from "../../../lib/roles";
import { cn } from "../../../lib/cn";
import { ltr, money } from "../../../lib/format";
import { useSettings } from "../../../context/SettingsContext";
import { Ticket, TicketRow } from "../../../components/layout";
import { Button, Segmented } from "../../../components/ui";
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
import { TablePicker } from "./TablePicker";

const TYPE_ICONS: Record<OrderType, JSX.Element> = {
  dine_in: <IconTable size={18} />,
  takeaway: <IconBag size={18} />,
  delivery: <IconBike size={18} />,
};

/**
 * سطر في الشيك: «2× قهوة تركي ........ 90.00».
 *
 * الاصطلاح التقليدي في الكاشير: كل بنود الشيك سطر واحد مقروء بنظرة، والسطر
 * اللي بتشتغل عليه بس هو اللي بيتفتح بأدواته (الكمية · الملاحظة · الحذف)،
 * وبيتظلّل زي القلم الفسفوري. آخر صنف بتضيفه بيتفتح لوحده.
 */
const CartRow = memo(function CartRow({
  line,
  active,
  onToggle,
  onChangeQty,
  onRemove,
  onNotes,
}: {
  line: CartLine;
  active: boolean;
  onToggle: (id: number) => void;
  onChangeQty: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onNotes: (id: number, notes: string) => void;
}) {
  // حقل الملاحظة بيتفتح عند الطلب بس — السلة بتفضل مقروءة بنظرة واحدة،
  // والملاحظة استثناء مش القاعدة.
  const [noteOpen, setNoteOpen] = useState(Boolean(line.notes));
  const rowRef = useRef<HTMLDivElement>(null);

  // السطر المفتوح لازم يفضل ظاهر حتى لو الشيك طويل
  useEffect(() => {
    if (active) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [active, noteOpen]);

  return (
    <div className="cartline" data-active={active || undefined} ref={rowRef}>
      <button
        type="button"
        className="cartline__main"
        aria-expanded={active}
        onClick={() => onToggle(line.menu_item_id)}
      >
        <span className="cartline__qty num">{line.quantity}×</span>
        <span className="cartline__name">{line.name}</span>
        <span className="trow__dots" aria-hidden="true" />
        <span className="cartline__sum num">{money(line.price * line.quantity)}</span>
      </button>

      {line.notes && !active && (
        <div className="cartline__noteline">
          <IconEdit size={13} />
          <span className="u-truncate">{line.notes}</span>
        </div>
      )}

      {active && (
        <div className="cartline__tools">
          <div className="stepper">
            <button
              type="button"
              className="stepper__btn"
              aria-label={`تقليل كمية ${line.name}`}
              onClick={() => onChangeQty(line.menu_item_id, -1)}
            >
              <IconMinus size={16} />
            </button>
            <span className="stepper__value num" aria-live="polite">
              {line.quantity}
            </span>
            <button
              type="button"
              className="stepper__btn"
              aria-label={`زيادة كمية ${line.name}`}
              onClick={() => onChangeQty(line.menu_item_id, 1)}
            >
              <IconPlus size={16} />
            </button>
          </div>

          <span className="cartline__meta num" dir="ltr">
            @ {money(line.price)}
          </span>

          {!noteOpen && (
            <button type="button" className="cartline__note-btn" onClick={() => setNoteOpen(true)}>
              <IconEdit size={14} />
              ملاحظة
            </button>
          )}

          <button
            type="button"
            className="cartline__remove"
            aria-label={`حذف ${line.name}`}
            onClick={() => onRemove(line.menu_item_id)}
          >
            <IconTrash size={17} />
          </button>
        </div>
      )}

      {active && noteOpen && (
        <input
          className="input cartline__note"
          autoFocus={!line.notes}
          placeholder="ملاحظة للمطبخ…"
          aria-label={`ملاحظة ${line.name}`}
          maxLength={255}
          value={line.notes ?? ""}
          onChange={(e) => onNotes(line.menu_item_id, e.target.value)}
          onBlur={() => {
            if (!line.notes) setNoteOpen(false);
          }}
        />
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

/** شيك الطلب الحالي — اللوحة الجانبية في شاشة الكاشير. */
export function CartPanel(p: CartPanelProps) {
  const { currency } = useSettings();
  const hasDiscount = p.discount !== "" && !p.discountTooBig && Number(p.discount) > 0;

  /* السطر المفتوح: آخر صنف اتضاف أو زادت كميته. بنقارن بالرسمة اللي فاتت
     عشان نعرف إيه اللي اتلمس — من غير ما نلمس منطق السلة نفسه. */
  const [activeId, setActiveId] = useState<number | null>(null);
  const toggleActive = useCallback(
    (id: number) => setActiveId((cur) => (cur === id ? null : id)),
    []
  );
  const previous = useRef(new Map<number, number>());
  useEffect(() => {
    let touched: number | null = null;
    for (const l of p.lines) {
      if ((previous.current.get(l.menu_item_id) ?? 0) < l.quantity) touched = l.menu_item_id;
    }
    previous.current = new Map(p.lines.map((l) => [l.menu_item_id, l.quantity]));
    if (p.lines.length === 0) setActiveId(null);
    else if (touched !== null) setActiveId(touched);
  }, [p.lines]);

  return (
    <Ticket
      title="الطلب الحالي"
      hint={p.count > 0 ? `${p.count} صنف في الشيك` : "ابدأ بإضافة أصناف من المنيو"}
      action={
        p.lines.length > 0 ? (
          <Button size="sm" variant="outline" icon={<IconTrash size={15} />} onClick={p.onClear}>
            تفريغ
          </Button>
        ) : undefined
      }
      controls={
        <>
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
            <TablePicker tables={p.tables} value={p.selectedTable} onChange={p.onSelectTable} />
          )}
        </>
      }
      footer={
        <>
          {/* خصم: بيتكتب على الشيك زي ما بيتكتب بالقلم — «خصم ...... [   ]» */}
          <div className="discountrow">
            <label className="discountrow__label" htmlFor="cart-discount">
              خصم ({currency})
            </label>
            <span className="trow__dots" aria-hidden="true" />
            <input
              id="cart-discount"
              className="input discountrow__input"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={p.discount}
              aria-invalid={p.discountTooBig || undefined}
              onChange={(e) => p.onDiscount(e.target.value)}
            />
          </div>
          {p.discountTooBig && <span className="field__error">الخصم أكبر من إجمالي الطلب</span>}

          <div className="u-col">
            <TicketRow label="المجموع" value={money(p.subtotal)} />
            {hasDiscount && <TicketRow label="الخصم" value={ltr(`− ${money(p.discount)}`)} />}
          </div>

          <div className="total-plate">
            <span className="total-plate__label">الإجمالي</span>
            <span className="total-plate__amount">
              {money(p.total)}
              <span className="total-plate__cur">{currency}</span>
            </span>
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
      {p.lines.length === 0 ? (
        <div className="cart-empty">
          <IconBag size={34} />
          <span>لسه مفيش أصناف مضافة</span>
        </div>
      ) : (
        <div className={cn("cartlines")}>
          {p.lines.map((line) => (
            <CartRow
              key={line.menu_item_id}
              line={line}
              active={activeId === line.menu_item_id}
              onToggle={toggleActive}
              onChangeQty={p.onChangeQty}
              onRemove={p.onRemove}
              onNotes={p.onNotes}
            />
          ))}
        </div>
      )}
    </Ticket>
  );
}
