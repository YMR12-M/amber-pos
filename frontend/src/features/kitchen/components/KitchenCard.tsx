import { memo } from "react";
import type { KitchenOrder, OrderItemStatus } from "../../../types";
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from "../../../types";
import { humanDuration, minutesSince } from "../../../lib/format";
import { Button, StatusBadge } from "../../../components/ui";
import {
  IconAlert,
  IconCheck,
  IconClock,
  IconFire,
  OrderTypeIcon,
} from "../../../components/icons";
import { cn } from "../../../lib/cn";
import { orderNo } from "../../../components/brand";

const STEPS: { value: OrderItemStatus; icon: JSX.Element }[] = [
  { value: "preparing", icon: <IconFire size={17} /> },
  { value: "ready", icon: <IconCheck size={17} /> },
];

const WARN_MINUTES = 10;
const LATE_MINUTES = 15;

/**
 * كرت الطلب في المطبخ. مفيش أي بيانات مالية هنا — بالتصميم،
 * لأن endpoint المطبخ نفسه مش بيرجّع أسعار.
 */
export const KitchenCard = memo(function KitchenCard({
  order,
  onItemStatus,
  onReady,
}: {
  order: KitchenOrder;
  onItemStatus: (orderId: number, itemId: number, status: OrderItemStatus) => void;
  onReady: (orderId: number) => void;
}) {
  const waited = minutesSince(order.created_at);
  const late = waited >= LATE_MINUTES;
  const warn = waited >= WARN_MINUTES;
  const done = order.items.every((i) => i.status === "ready" || i.status === "served");

  return (
    <article className={cn("ordercard", late && "ordercard--late")}>
      <div className="ordercard__head">
        <span className="ordercard__num num">{orderNo(order.id)}</span>
        <span className={cn("timer", late ? "timer--late" : warn ? "timer--warn" : undefined)}>
          <IconClock size={13} />
          {humanDuration(waited)}
        </span>
      </div>

      <div className="ordercard__meta">
        <OrderTypeIcon type={order.order_type} />
        {order.table_label ?? ORDER_TYPE_LABELS[order.order_type]}
        <span aria-hidden="true">·</span>
        <StatusBadge status={order.status} />
      </div>

      <div className="u-col" style={{ gap: 8 }}>
        {order.items.map((item) => (
          <div key={item.id} className="kitem" data-status={item.status}>
            <span className="kitem__qty">{item.quantity}</span>

            <div className="u-grow">
              <div className="kitem__name u-truncate">{item.item_name}</div>
              {item.notes && (
                <div className="kitem__note">
                  <IconAlert size={13} />
                  {item.notes}
                </div>
              )}
            </div>

            <div className="kitem__steps">
              {STEPS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  title={ORDER_STATUS_LABELS[s.value]}
                  aria-label={`${item.item_name}: ${ORDER_STATUS_LABELS[s.value]}`}
                  aria-pressed={item.status === s.value}
                  className={cn("kitem__step", item.status === s.value && "is-active")}
                  onClick={() => onItemStatus(order.id, item.id, s.value)}
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        variant={done ? "primary" : "soft"}
        size="lg"
        block
        disabled={order.status === "ready"}
        icon={<IconCheck size={18} />}
        onClick={() => onReady(order.id)}
      >
        {order.status === "ready" ? "جاهز للتقديم" : "الطلب جاهز بالكامل"}
      </Button>
    </article>
  );
});
