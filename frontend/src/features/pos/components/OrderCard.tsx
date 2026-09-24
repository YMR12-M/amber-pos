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
  cash: <IconCash size={16} />,
  card: <IconCard size={16} />,
  other: <IconWallet size={16} />,
};

/** كرت طلب مفتوح مع أزرار الدفع والإلغاء. */
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
    <article className="ordercard">
      <div className="ordercard__head">
        <span className="ordercard__num num">{orderNo(order.id)}</span>
        <StatusBadge status={order.status} />
      </div>

      <div className="ordercard__meta">
        <OrderTypeIcon type={order.order_type} />
        {order.table_label ?? ORDER_TYPE_LABELS[order.order_type]}
        <span aria-hidden="true">·</span>
        <IconClock size={14} />
        {humanDuration(waited)}
      </div>

      <div className="ordercard__items">
        {order.items.map((item) => (
          <div key={item.id} className="ordercard__item">
            <span className="u-truncate">
              {item.item_name} <span className="u-muted num">× {item.quantity}</span>
            </span>
            <span className="num">{money(Number(item.unit_price) * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="ordercard__total">
        <span style={{ fontWeight: 700 }}>الإجمالي</span>
        <span className="ordercard__amount">
          {money(order.total)} <span className="menucard__cur">{currency}</span>
        </span>
      </div>

      <div className="ordercard__pay">
        {/* كاش هو الأشيع، فهو الزر الأساسي — والباقي هادي عشان
            الكاشير ما يضيّعش وقت في الاختيار. */}
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
        style={{ color: "var(--danger)" }}
        onClick={() => onCancel(order)}
      >
        إلغاء الطلب
      </Button>
    </article>
  );
});
