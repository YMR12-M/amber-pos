import { memo } from "react";
import type { RestaurantTable, TableStatus } from "../../../types";
import { TABLE_STATUS_LABELS } from "../../../types";
import { Badge, EmptyState } from "../../../components/ui";
import { IconTable } from "../../../components/icons";

const TONE: Record<TableStatus, "ready" | "cancelled" | "pending"> = {
  free: "ready",
  occupied: "cancelled",
  reserved: "pending",
};

/** خريطة الطاولات — نظرة سريعة على القاعة. */
export const TablesMap = memo(function TablesMap({ tables }: { tables: RestaurantTable[] }) {
  if (tables.length === 0) {
    return <EmptyState icon={<IconTable size={30} />} title="مفيش طاولات مسجّلة" />;
  }

  const free = tables.filter((t) => t.status === "free").length;

  return (
    <div className="section">
      <div className="section__head">
        <div>
          <h2 className="section__title">خريطة القاعة</h2>
          <div className="section__desc">
            {free} متاحة من {tables.length}
          </div>
        </div>
      </div>

      <div className="grid-tiles">
        {tables.map((t) => (
          <div key={t.id} className="tabletile" data-status={t.status}>
            <span className="tabletile__label">{t.label}</span>
            {t.active_order_id && (
              <span className="u-muted" style={{ fontSize: "var(--fs-xs)", fontWeight: 700 }}>
                طلب مفتوح #{t.active_order_id}
              </span>
            )}
            <span className="tabletile__foot">
              <Badge tone={TONE[t.status]} dot>
                {TABLE_STATUS_LABELS[t.status]}
              </Badge>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
