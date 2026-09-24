import type { Order, RestaurantTable } from "../../../types";
import { money } from "../../../lib/format";
import { Sidebar, SummaryRow } from "../../../components/layout";
import { IconReceipt, IconTable } from "../../../components/icons";

/** ملخص الوردية — بيظهر في اللوحة الجانبية بدل السلة. */
export function ShiftPanel({
  openOrders,
  tables,
}: {
  openOrders: Order[];
  tables: RestaurantTable[];
}) {
  const openValue = openOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const freeTables = tables.filter((t) => t.status === "free").length;

  return (
    <Sidebar title="ملخص الوردية" hint="لحظي — بيتحدّث كل 8 ثواني">
      <div className="u-col" style={{ gap: 20 }}>
        <div>
          <div className="sidebar__hint u-row">
            <IconReceipt size={15} /> طلبات مفتوحة
          </div>
          <div className="total-amount">{openOrders.length}</div>
        </div>

        <div>
          <div className="sidebar__hint">قيمتها الإجمالية</div>
          <div className="total-amount" style={{ fontSize: "var(--fs-2xl)" }}>
            {money(openValue)}
          </div>
        </div>

        <div>
          <div className="sidebar__hint u-row">
            <IconTable size={15} /> طاولات متاحة
          </div>
          <div className="total-amount" style={{ fontSize: "var(--fs-2xl)" }}>
            {freeTables}
            <span style={{ color: "var(--panel-text-soft)", fontSize: "var(--fs-lg)" }}>
              {" "}
              من {tables.length}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <SummaryRow label="متوسط الطلب المفتوح" value={money(openValue / (openOrders.length || 1))} />
      </div>
    </Sidebar>
  );
}
