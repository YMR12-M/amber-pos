import { useMemo, useState } from "react";
import { api } from "../../../api";
import type { SalesReport as SalesReportData } from "../../../types";
import { PAYMENT_METHOD_LABELS } from "../../../types";
import { formatDay, int, money } from "../../../lib/format";
import { useAsyncList } from "../../../hooks/useAsyncList";
import { useSettings } from "../../../context/SettingsContext";
import {
  Card,
  CardHead,
  EmptyState,
  ErrorLine,
  Segmented,
  Skeleton,
  Stat,
} from "../../../components/ui";
import { IconChart, IconReceipt, IconTag, IconWallet } from "../../../components/icons";
import { SalesChart } from "./SalesChart";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

/** ألوان السلاسل بترتيب ثابت — مش بتتبدّل لو اتفلترت. */
const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];

/** تقرير المبيعات: مؤشرات + منحنى يومي + توزيع طرق الدفع + جدول. */
export function SalesReport() {
  const { currency } = useSettings();
  const [days, setDays] = useState<Range>(7);
  const { data, loading, error } = useAsyncList<SalesReportData>(
    () => api.getSalesReport(days),
    [days]
  );

  const daily = data?.daily ?? [];
  const byMethod = data?.by_payment_method ?? [];

  const totals = useMemo(() => {
    const sales = daily.reduce((s, r) => s + Number(r.total_sales || 0), 0);
    const orders = daily.reduce((s, r) => s + Number(r.orders_count || 0), 0);
    const discount = daily.reduce((s, r) => s + Number(r.total_discount || 0), 0);
    const best = daily.reduce<{ day: string; value: number }>(
      (acc, r) =>
        Number(r.total_sales) > acc.value ? { day: r.day, value: Number(r.total_sales) } : acc,
      { day: "", value: 0 }
    );
    return { sales, orders, discount, avg: orders > 0 ? sales / orders : 0, best };
  }, [daily]);

  const methodTotal = byMethod.reduce((s, m) => s + Number(m.total_sales), 0) || 1;
  const peak = Math.max(1, ...daily.map((r) => Number(r.total_sales || 0)));

  return (
    <div className="section">
      <div className="section__head">
        <div>
          <h2 className="section__title">تقرير المبيعات</h2>
          <div className="section__desc">الطلبات المدفوعة فقط</div>
        </div>
        <Segmented
          label="مدى التقرير"
          value={String(days)}
          onChange={(v) => setDays(Number(v) as Range)}
          options={RANGES.map((d) => ({ value: String(d), label: `آخر ${d} يوم` }))}
        />
      </div>

      <ErrorLine message={error} />

      {loading ? (
        <div className="u-col" style={{ gap: 16 }}>
          <div className="grid-stats">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} h={120} r={16} />
            ))}
          </div>
          <Skeleton h={300} r={16} />
        </div>
      ) : daily.length === 0 ? (
        <EmptyState
          icon={<IconChart size={30} />}
          title="مفيش مبيعات مسجّلة"
          text={`مافيش طلبات مدفوعة في آخر ${days} يوم.`}
        />
      ) : (
        <>
          <div className="grid-stats">
            <Stat
              accent
              label="إجمالي المبيعات"
              value={money(totals.sales)}
              unit={currency}
              icon={<IconChart size={15} />}
              foot={`على مدار ${days} يوم`}
            />
            <Stat
              label="عدد الطلبات"
              value={int(totals.orders)}
              icon={<IconReceipt size={15} />}
              foot={totals.best.day ? `أعلى يوم: ${formatDay(totals.best.day)}` : undefined}
            />
            <Stat
              label="متوسط الفاتورة"
              value={money(totals.avg)}
              unit={currency}
              icon={<IconWallet size={15} />}
            />
            <Stat
              label="إجمالي الخصومات"
              value={money(totals.discount)}
              unit={currency}
              icon={<IconTag size={15} />}
            />
          </div>

          <Card flush>
            <CardHead title="المبيعات اليومية" />
            <div style={{ padding: "var(--sp-4) var(--sp-5) var(--sp-2)" }}>
              <SalesChart daily={daily} />
            </div>
          </Card>

          {byMethod.length > 0 && (
            <Card pad>
              <h3 className="card__title" style={{ marginBottom: 4 }}>
                حسب طريقة الدفع
              </h3>

              <div className="viz">
                <div className="propbar" role="presentation">
                  {byMethod.map((m, i) => (
                    <div
                      key={m.payment_method}
                      className="propbar__seg"
                      style={{
                        flexGrow: Number(m.total_sales) / methodTotal,
                        background: SERIES[i % SERIES.length],
                      }}
                    />
                  ))}
                </div>

                {/* تسميات مباشرة — الهوية مش معتمدة على اللون لوحده */}
                <div className="legend">
                  {byMethod.map((m, i) => (
                    <div key={m.payment_method} className="legend__item">
                      <span
                        className="legend__swatch"
                        style={{ background: SERIES[i % SERIES.length] }}
                      />
                      <span>
                        <span className="legend__label">
                          {PAYMENT_METHOD_LABELS[m.payment_method] ?? m.payment_method} ·{" "}
                          {int(m.orders_count)} طلب
                        </span>
                        <br />
                        <span className="legend__value">
                          {money(m.total_sales)} {currency}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <Card flush>
            <CardHead title="التفصيل اليومي" />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>اليوم</th>
                    <th>الطلبات</th>
                    <th>الخصومات</th>
                    <th>المبيعات</th>
                    <th style={{ width: "32%" }}>المقارنة</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((r) => (
                    <tr key={r.day}>
                      <td style={{ fontWeight: 700 }}>{formatDay(r.day)}</td>
                      <td className="num">{int(r.orders_count)}</td>
                      <td className="num u-muted">{money(r.total_discount)}</td>
                      <td className="num" style={{ fontWeight: 800 }}>
                        {money(r.total_sales)} {currency}
                      </td>
                      <td>
                        <div className="bar">
                          <div
                            className="bar__fill"
                            style={{ width: `${(Number(r.total_sales) / peak) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
