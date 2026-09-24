import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Order, OrderType, PaymentMethod } from "../types";
import { usePolling } from "../hooks/usePolling";
import { AppShell } from "../components/layout";
import { Button, EmptyState, Modal, useDialog, useToast } from "../components/ui";
import {
  IconAlert,
  IconCheckCircle,
  IconGrid,
  IconPrint,
  IconReceipt,
  IconRefresh,
  IconTable,
} from "../components/icons";
import Receipt from "../components/Receipt";
import { orderNo } from "../components/brand";
import { useCart } from "../features/pos/useCart";
import { usePosData } from "../features/pos/usePosData";
import { MenuGrid } from "../features/pos/components/MenuGrid";
import { CartPanel } from "../features/pos/components/CartPanel";
import { OrderCard } from "../features/pos/components/OrderCard";
import { TablesMap } from "../features/pos/components/TablesMap";
import { ShiftPanel } from "../features/pos/components/ShiftPanel";

type View = "new" | "open" | "tables";

/**
 * شاشة الكاشير.
 * الصفحة دي بقت "تركيب" بس — المنطق في useCart/usePosData
 * والعرض في features/pos/components.
 */
export default function POS() {
  const [view, setView] = useState<View>("new");
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<{ order: Order; method: PaymentMethod } | null>(null);

  const cart = useCart();
  const data = usePosData();
  const toast = useToast();
  const dialog = useDialog();

  /* محل من غير طاولات (تيك أواي بس، أو أول يوم شغل) — "صالة" بتبقى
     خيار مستحيل يتنفّذ، فبنحوّل لتيك أواي بدل ما الكاشير يكتشف بنفسه
     إن زرار الإرسال مش بيشتغل. */
  useEffect(() => {
    if (!data.loading && data.tables.length === 0 && orderType === "dine_in") {
      setOrderType("takeaway");
    }
  }, [data.loading, data.tables.length, orderType]);

  // تحديث الطلبات المفتوحة — بيقف تلقائياً لو التبويب مش ظاهر.
  // على تبويب "طلب جديد" بنبطّأ بدل ما نوقف، عشان عدّاد الدوك
  // ما يفضلش بايت والكاشير بيجهّز طلب.
  usePolling(data.refreshLive, view === "new" ? 20000 : 8000);

  const submitOrder = useCallback(async () => {
    if (cart.lines.length === 0 || cart.discountTooBig) return;
    setPlacing(true);
    try {
      await api.createOrder({
        table_id: orderType === "dine_in" ? selectedTable : null,
        order_type: orderType,
        items: cart.lines.map((l) => ({
          menu_item_id: l.menu_item_id,
          quantity: l.quantity,
          notes: l.notes?.trim() || null,
        })),
        discount: cart.discountValue,
      });
      cart.clear();
      setSelectedTable(null);
      toast.success("تم إرسال الطلب للمطبخ");
      data.refreshLive();
    } catch (err) {
      toast.fromError(err, "فشل إرسال الطلب");
    } finally {
      setPlacing(false);
    }
  }, [cart, orderType, selectedTable, toast, data]);

  const payOrder = useCallback(
    async (order: Order, method: PaymentMethod) => {
      setPayingId(order.id);
      try {
        await api.payOrder(order.id, method);
        setReceipt({ order, method });
        toast.success(`تم دفع الطلب ${orderNo(order.id)}`);
        await data.refreshLive();
      } catch (err) {
        toast.fromError(err, "فشل الدفع");
      } finally {
        setPayingId(null);
      }
    },
    [toast, data]
  );

  const cancelOrder = useCallback(
    async (order: Order) => {
      const ok = await dialog.confirm({
        title: `إلغاء الطلب ${orderNo(order.id)}؟`,
        message: "الإلغاء نهائي ومش هينفع ترجع فيه، والطاولة هتتفضّى.",
        confirmLabel: "أيوة، ألغِ الطلب",
        danger: true,
      });
      if (!ok) return;
      try {
        await api.updateOrderStatus(order.id, "cancelled");
        toast.info(`تم إلغاء الطلب ${orderNo(order.id)}`);
        await data.refreshLive();
      } catch (err) {
        toast.fromError(err, "فشل الإلغاء");
      }
    },
    [dialog, toast, data]
  );

  const canSubmit =
    cart.lines.length > 0 &&
    !placing &&
    !cart.discountTooBig &&
    (orderType !== "dine_in" || selectedTable !== null);

  const dockItems = useMemo(
    () => [
      { id: "new", label: "طلب جديد", icon: <IconGrid />, badge: cart.count || undefined },
      { id: "open", label: "الطلبات المفتوحة", icon: <IconReceipt />, badge: data.openOrders.length || undefined },
      { id: "tables", label: "الطاولات", icon: <IconTable /> },
    ],
    [cart.count, data.openOrders.length]
  );

  const sidebar =
    view === "new" ? (
      <CartPanel
        lines={cart.lines}
        subtotal={cart.subtotal}
        total={cart.total}
        discount={cart.discount}
        discountTooBig={cart.discountTooBig}
        count={cart.count}
        orderType={orderType}
        tables={data.tables}
        selectedTable={selectedTable}
        placing={placing}
        canSubmit={canSubmit}
        onOrderType={setOrderType}
        onSelectTable={setSelectedTable}
        onDiscount={cart.setDiscount}
        onChangeQty={cart.changeQty}
        onRemove={cart.remove}
        onNotes={cart.setNotes}
        onClear={cart.clear}
        onSubmit={submitOrder}
      />
    ) : (
      <ShiftPanel openOrders={data.openOrders} tables={data.tables} />
    );

  return (
    <AppShell
      title="نقطة البيع"
      subtitle="إنشاء الطلبات · الدفع · الفواتير"
      sidebar={sidebar}
      dockItems={dockItems}
      activeDockId={view}
      onDockSelect={(id) => setView(id as View)}
    >
      {data.error && (
        <div className="alert alert--danger" role="alert">
          <IconAlert size={20} />
          <div className="u-grow">
            <strong>تعذّر تحميل المنيو</strong>
            <div className="alert__detail">{data.error}</div>
          </div>
          <Button variant="soft" icon={<IconRefresh size={17} />} onClick={data.reload}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {data.liveError && !data.error && (
        <div className="alert alert--warning" role="status">
          <IconAlert size={18} />
          <span className="u-grow">{data.liveError}</span>
          <Button size="sm" variant="ghost" onClick={data.refreshLive}>
            تحديث
          </Button>
        </div>
      )}

      {view === "new" && !data.error && (
        <MenuGrid
          categories={data.categories}
          items={data.items}
          quantities={cart.quantities}
          loading={data.loading}
          onAdd={cart.add}
        />
      )}

      {view === "open" && (
        <div className="section">
          <div className="section__head">
            <div>
              <h2 className="section__title">الطلبات المفتوحة</h2>
              <div className="section__desc">
                {data.openOrders.length} طلب مستني الدفع أو التقديم
              </div>
            </div>
          </div>

          {data.openOrders.length === 0 ? (
            <EmptyState
              icon={<IconReceipt size={30} />}
              title="مفيش طلبات مفتوحة"
              text="كل الطلبات اتقفلت. ابدأ طلب جديد من التبويب الأول."
              action={
                <Button variant="primary" onClick={() => setView("new")}>
                  طلب جديد
                </Button>
              }
            />
          ) : (
            <div className="grid-cards">
              {data.openOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  paying={payingId === order.id}
                  onPay={payOrder}
                  onCancel={cancelOrder}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {view === "tables" && <TablesMap tables={data.tables} />}

      <Modal
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        title="تم الدفع بنجاح"
        icon={<IconCheckCircle size={24} />}
        iconTone="success"
        footer={
          <>
            <Button variant="soft" onClick={() => setReceipt(null)}>
              إغلاق
            </Button>
            <Button variant="primary" icon={<IconPrint size={18} />} onClick={() => window.print()}>
              طباعة الفاتورة
            </Button>
          </>
        }
      >
        {receipt && <Receipt order={receipt.order} paymentMethod={receipt.method} />}
      </Modal>
    </AppShell>
  );
}
