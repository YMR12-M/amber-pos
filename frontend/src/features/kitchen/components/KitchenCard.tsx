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

/* الزرارين بيتقروا من بعيد وبإيد مشغولة — فكل واحد معاه كلمة قصيرة مش أيقونة لوحدها. */
const STEPS: {
  value: Extract<OrderItemStatus, "preparing" | "ready">;
  icon: JSX.Element;
  short: string;
}[] = [
  { value: "preparing", icon: <IconFire size={18} />, short: "تحضير" },
  { value: "ready", icon: <IconCheck size={18} />, short: "جاهز" },
];

const WARN_MINUTES = 10;
const LATE_MINUTES = 15;

/**
 * بون المطبخ — ورقة معلّقة في مشبك على سكة. شريط العمر فوق (أخضر ثم أصفر
 * ثم شريط تحذير) بيقول مين اتأخر من بعيد من غير ما حد يقرا رقم. مفيش أي
 * بيانات مالية هنا — بالتصميم، لأن endpoint المطبخ نفسه مش بيرجّع أسعار.
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
    <article className="docket" data-late={late || undefined}>
      <span className="docket__rail" aria-hidden="true" />
      <span className="docket__clip" aria-hidden="true" />
      <div
        className="docket__tape"
        data-age={late ? "late" : warn ? "warn" : "ok"}
        aria-hidden="true"
      />

      <header className="docket__head">
        <span className="docket__no num">{orderNo(order.id)}</span>
        <span className={cn("timer", late ? "timer--late" : warn ? "timer--warn" : undefined)}>
          <IconClock size={14} />
          <span className="num">{humanDuration(waited)}</span>
          {late && <span className="sr-only">متأخر</span>}
        </span>
      </header>

      <div className="docket__meta">
        <OrderTypeIcon type={order.order_type} size={16} />
        <span>{order.table_label ?? ORDER_TYPE_LABELS[order.order_type]}</span>
        {order.status === "ready" ? (
          <span className="stamp stamp--ready stamp--sm">جاهز</span>
        ) : (
          <StatusBadge status={order.status} />
        )}
      </div>

      <div className="docket__items">
        {order.items.map((item) => (
          <div key={item.id} className="kitem" data-status={item.status}>
            <span className="kitem__qty num">{item.quantity}</span>

            <div className="u-grow">
              <div className="kitem__name">{item.item_name}</div>
              {item.notes && (
                <div className="kitem__note">
                  <IconAlert size={14} />
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
                  data-step={s.value}
                  className={cn("kitem__step", item.status === s.value && "is-active")}
                  onClick={() => onItemStatus(order.id, item.id, s.value)}
                >
                  {s.icon}
                  <span className="kitem__step-label" aria-hidden="true">
                    {s.short}
                  </span>
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
        icon={<IconCheck size={20} />}
        onClick={() => onReady(order.id)}
      >
        {order.status === "ready" ? "جاهز للتقديم" : "الطلب جاهز بالكامل"}
      </Button>
    </article>
  );
});
