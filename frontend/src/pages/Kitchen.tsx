import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { KitchenOrder, OrderItemStatus, OrderStatus } from "../types";
import { minutesSince } from "../lib/format";
import { usePolling } from "../hooks/usePolling";
import { AppShell } from "../components/layout";
import { orderNo } from "../components/brand";
import {
  EmptyState,
  ErrorLine,
  IconButton,
  SkeletonGrid,
  Stat,
  useToast,
} from "../components/ui";
import {
  IconCheck,
  IconChef,
  IconClock,
  IconFire,
  IconRefresh,
} from "../components/icons";
import { useKitchenQueue } from "../features/kitchen/useKitchenQueue";
import { KitchenCard } from "../features/kitchen/components/KitchenCard";

type Filter = "all" | "pending" | "preparing" | "ready";

const FILTER_MATCH: Record<Exclude<Filter, "all">, OrderStatus[]> = {
  pending: ["pending"],
  preparing: ["preparing"],
  ready: ["ready"],
};

const LATE_MINUTES = 15;

/** شاشة المطبخ — لوحة البونات: طابور الطلبات وتحديث حالتها. */
export default function Kitchen() {
  const [filter, setFilter] = useState<Filter>("all");
  const { orders, error, loading, refresh, setError } = useKitchenQueue();
  const toast = useToast();

  // مصدر جلب واحد: أول تحميل + التحديث الدوري من نفس الهوك
  usePolling(refresh, 5000, { immediate: true });

  // خط أكبر وتباين أعلى — الشاشة بتتقرا من بعيد
  useEffect(() => {
    document.documentElement.dataset.density = "kitchen";
    return () => {
      delete document.documentElement.dataset.density;
    };
  }, []);

  const markItem = useCallback(
    async (orderId: number, itemId: number, status: OrderItemStatus) => {
      try {
        await api.updateOrderItemStatus(orderId, itemId, status);
        await refresh();
      } catch (err) {
        toast.fromError(err, "فشل تحديث الصنف");
        setError("");
      }
    },
    [refresh, toast, setError]
  );

  const markReady = useCallback(
    async (orderId: number) => {
      try {
        await api.updateOrderStatus(orderId, "ready");
        toast.success(`الطلب ${orderNo(orderId)} جاهز`);
        await refresh();
      } catch (err) {
        toast.fromError(err, "فشل التحديث");
      }
    },
    [refresh, toast]
  );

  const counts = useMemo(() => {
    const c = { pending: 0, preparing: 0, ready: 0, late: 0 };
    for (const o of orders) {
      if (o.status === "pending") c.pending++;
      else if (o.status === "preparing") c.preparing++;
      else if (o.status === "ready") c.ready++;
      if (minutesSince(o.created_at) >= LATE_MINUTES) c.late++;
    }
    return c;
  }, [orders]);

  const visible: KitchenOrder[] = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => FILTER_MATCH[filter].includes(o.status))),
    [orders, filter]
  );

  const tabs = useMemo(
    () => [
      { id: "all", label: "كل الطلبات", icon: <IconChef size={20} />, badge: orders.length || undefined },
      { id: "pending", label: "قيد الانتظار", icon: <IconClock size={20} />, badge: counts.pending || undefined },
      { id: "preparing", label: "جاري التحضير", icon: <IconFire size={20} />, badge: counts.preparing || undefined },
      { id: "ready", label: "جاهز", icon: <IconCheck size={20} />, badge: counts.ready || undefined },
    ],
    [orders.length, counts]
  );

  return (
    <AppShell
      title="شاشة المطبخ"
      subtitle="بيتحدّث كل 5 ثواني — من غير أي بيانات مالية"
      actions={
        <IconButton
          label="تحديث الآن"
          variant="onbar"
          icon={<IconRefresh size={20} />}
          onClick={refresh}
        />
      }
      tabs={tabs}
      activeTab={filter}
      onTabSelect={(id) => setFilter(id as Filter)}
    >
      <div className="section">
        <ErrorLine message={error} />

        {/* لوحة النتيجة: أرقام الطابور بنظرة واحدة من بعيد */}
        <div className="scoreboard" aria-label="حالة المطبخ">
          <Stat label="في الطابور" value={orders.length} />
          <Stat label="قيد الانتظار" value={counts.pending} />
          <Stat label="جاري التحضير" value={counts.preparing} />
          <Stat label="جاهز" value={counts.ready} />
          {counts.late > 0 && <Stat danger label={`متأخرة +${LATE_MINUTES} د`} value={counts.late} />}
        </div>

        {loading ? (
          <SkeletonGrid className="board" count={4} height={300} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<IconChef size={30} />}
            title={filter === "all" ? "الطابور فاضي" : "مفيش طلبات في الحالة دي"}
            text="أول ما الكاشير يبعت طلب هيظهر هنا فوراً."
          />
        ) : (
          <div className="board">
            {visible.map((order) => (
              <KitchenCard
                key={order.id}
                order={order}
                onItemStatus={markItem}
                onReady={markReady}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
