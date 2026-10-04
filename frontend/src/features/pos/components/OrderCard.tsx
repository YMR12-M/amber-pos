import { memo } from "react";
import type { Order, PaymentMethod } from "../../../types";
import { ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "../../../types";
import { PAYMENT_METHODS } from "../../../lib/roles";
import { humanDuration, minutesSince, money } from "../../../lib/format";
import { Button, StatusBadge } from "../../../components/ui";
import { orderNo } from "../../../components/brand";
import { useSettings } from "../../../context/SettingsContext";
import {
  IconCard,
  IconCash,
  IconClock,
  IconClose,
  IconWallet,
  OrderTypeIcon,
} from "../../../components/icons";

const METHOD_ICONS: Record<PaymentMethod, JSX.Element> = {
  cash: <IconCash size={18} />,
  card: <IconCard size={18} />,
  other: <IconWallet size={18} />,
};

/**
 * قصاصة طلب مفتوح: رقم الشيك بالحبر الأحمر زي بلوك الشيكات، البنود بخط
 * منقّط، والإجمالي تحته بخط مزدوج. أزرار الدفع مفاتيح — كاش هو الأشيع،
 * فهو الزر الأساسي.
 */
export const OrderCard = memo(function OrderCard({
  order,
  paying,
  onPay,
  onCancel,
}: {
  order: Order;
  paying: boolean;
  onPay: (order: Order, method: PaymentMethod) => void;
  onCancel: (order: Order) => void;
}) {
  const { currency } = useSettings();
  const waited = minutesSince(order.created_at);

  return (
    <article className="slip">
      <header className="slip__head">
        <span className="slip__no num">{orderNo(order.id)}</span>
        <StatusBadge status={order.status} />
      </header>

      <div className="slip__meta">
        <OrderTypeIcon type={order.order_type} size={16} />
        <span>{order.table_label ?? ORDER_TYPE_LABELS[order.order_type]}</span>
        <span aria-hidden="true">·</span>
        <IconClock size={15} />
        <span className="num">{humanDuration(waited)}</span>
      </div>

      <ul className="slip__items">
        {order.items.map((item) => (
          <li key={item.id} className="slip__item">
            <span className="slip__qty num">{item.quantity}×</span>
            <span className="u-truncate">{item.item_name}</span>
            <span className="trow__dots" aria-hidden="true" />
            <span className="num">{money(Number(item.unit_price) * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="slip__total">
        <span className="slip__total-label">الإجمالي</span>
        <span className="slip__amount num">
          {money(order.total)}
          <span className="slip__cur">{currency}</span>
        </span>
      </div>

      <div className="slip__pay" role="group" aria-label="طريقة الدفع">
        {PAYMENT_METHODS.map((m) => (
          <Button
            key={m}
            variant={m === "cash" ? "primary" : "soft"}
            size="sm"
            loading={paying}
            icon={METHOD_ICONS[m]}
            onClick={() => onPay(order, m)}
          >
            {PAYMENT_METHOD_LABELS[m]}
          </Button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        block
        icon={<IconClose size={15} />}
        className="slip__cancel"
        onClick={() => onCancel(order)}
      >
        إلغاء الطلب
      </Button>
    </article>
  );
});
