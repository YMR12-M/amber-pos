import type { Order, RestaurantTable } from "../../../types";
import { money } from "../../../lib/format";
import { useSettings } from "../../../context/SettingsContext";
import { Ticket, TicketRow } from "../../../components/layout";
import { IconReceipt, IconTable } from "../../../components/icons";

/**
 * ملخص الوردية — بيظهر في اللوحة الجانبية بدل شيك الطلب.
 * شكله شريط الإيصال الحراري اللي بيتطبع في آخر الوردية (Z-report):
 * أرقام كبيرة بخط الإيصال، وبينها خطوط متقطّعة.
 */
export function ShiftPanel({
  openOrders,
  tables,
}: {
  openOrders: Order[];
  tables: RestaurantTable[];
}) {
  const { currency } = useSettings();
  const openValue = openOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const freeTables = tables.filter((t) => t.status === "free").length;

  return (
    <Ticket title="ملخص الوردية" hint="لحظي — بيتحدّث كل 8 ثواني" className="ticket--tape">
      <div className="tape">
        <div className="tape__block">
          <div className="tape__label">
            <IconReceipt size={16} /> طلبات مفتوحة
          </div>
          <div className="tape__big num">{openOrders.length}</div>
        </div>

        <div className="tape__block">
          <div className="tape__label">قيمتها الإجمالية</div>
          <div className="tape__big tape__big--md num">
            {money(openValue)}
            <span className="tape__cur">{currency}</span>
          </div>
        </div>

        <div className="tape__block">
          <div className="tape__label">
            <IconTable size={16} /> طاولات متاحة
          </div>
          <div className="tape__big tape__big--md num">
            {freeTables}
            <span className="tape__cur"> / {tables.length}</span>
          </div>
        </div>
      </div>

      <div className="tape__foot">
        <TicketRow
          total
          label="متوسط الطلب المفتوح"
          value={money(openValue / (openOrders.length || 1))}
        />
      </div>
    </Ticket>
  );
}
