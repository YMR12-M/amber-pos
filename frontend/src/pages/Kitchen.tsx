import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { KitchenOrder, OrderItemStatus, OrderStatus } from "../types";
import { minutesSince } from "../lib/format";
import { usePolling } from "../hooks/usePolling";
import { AppShell, Sidebar, SummaryRow } from "../components/layout";
import {
  EmptyState,
  ErrorLine,
  IconButton,
  SkeletonGrid,
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

/** شاشة المطبخ — طابور الطلبات وتحديث حالتها. */
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
        toast.success(`الطلب #${orderId} جاهز`);
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

  const dockItems = useMemo(
    () => [
      { id: "all", label: "كل الطلبات", icon: <IconChef />, badge: orders.length || undefined },
      { id: "pending", label: "قيد الانتظار", icon: <IconClock />, badge: counts.pending || undefined },
      { id: "preparing", label: "جاري التحضير", icon: <IconFire />, badge: counts.preparing || undefined },
      { id: "ready", label: "جاهز", icon: <IconCheck />, badge: counts.ready || undefined },
    ],
    [orders.length, counts]
  );

  return (
    <AppShell
      title="شاشة المطبخ"
      subtitle="طابور التحضير — من غير أي بيانات مالية"
      actions={
        <IconButton
          label="تحديث الآن"
          variant="plain"
          icon={<IconRefresh size={20} />}
          onClick={refresh}
        />
      }
      dockItems={dockItems}
      activeDockId={filter}
      onDockSelect={(id) => setFilter(id as Filter)}
      sidebar={
        <Sidebar title="حالة المطبخ" hint="بيتحدّث كل 5 ثواني">
          <div className="u-col" style={{ gap: 20 }}>
            <div>
              <div className="sidebar__hint">طلبات في الطابور</div>
              <div className="total-amount">{orders.length}</div>
            </div>
            {counts.late > 0 && (
              <div>
                <div className="sidebar__hint" style={{ color: "#ff9a9a" }}>
                  متأخرة عن {LATE_MINUTES} دقيقة
                </div>
                <div className="total-amount" style={{ background: "none", color: "#ff8080" }}>
                  {counts.late}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: "auto", paddingTop: 20 }}>
            <SummaryRow label="قيد الانتظار" value={counts.pending} />
            <SummaryRow label="جاري التحضير" value={counts.preparing} />
            <SummaryRow label="جاهز" value={counts.ready} total />
          </div>
        </Sidebar>
      }
    >
      <div className="section">
        <ErrorLine message={error} />

        {loading ? (
          <SkeletonGrid count={6} height={280} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<IconChef size={30} />}
            title={filter === "all" ? "الطابور فاضي" : "مفيش طلبات في الحالة دي"}
            text="أول ما الكاشير يبعت طلب هيظهر هنا فوراً."
          />
        ) : (
          <div className="grid-cards">
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
