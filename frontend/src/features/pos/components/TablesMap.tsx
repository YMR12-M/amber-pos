import { memo } from "react";
import type { RestaurantTable, TableStatus } from "../../../types";
import { TABLE_STATUS_LABELS } from "../../../types";
import { EmptyState } from "../../../components/ui";
import { IconTable } from "../../../components/icons";
import { TableTile } from "./TableTile";

const LEGEND: TableStatus[] = ["free", "occupied", "reserved"];

/** خريطة القاعة — نظرة سريعة على الطاولات: رسمة من فوق + حالتها. */
export const TablesMap = memo(function TablesMap({ tables }: { tables: RestaurantTable[] }) {
  if (tables.length === 0) {
    return <EmptyState icon={<IconTable size={30} />} title="مفيش طاولات مسجّلة" />;
  }

  const counts: Record<TableStatus, number> = { free: 0, occupied: 0, reserved: 0 };
  for (const t of tables) counts[t.status]++;

  return (
    <div className="section">
      <div className="section__head">
        <div>
          <h2 className="section__title">خريطة القاعة</h2>
          <div className="section__desc">
            {counts.free} متاحة من {tables.length}
          </div>
        </div>

        {/* مفتاح الخريطة */}
        <ul className="legend legend--lamps" aria-label="مفتاح الحالات">
          {LEGEND.map((s) => (
            <li key={s} className="legend__item" data-status={s}>
              <span className="tabletile__lamp" aria-hidden="true" />
              <span className="legend__label">{TABLE_STATUS_LABELS[s]}</span>
              <span className="legend__value num">{counts[s]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid-tiles">
        {tables.map((t) => (
          <TableTile key={t.id} table={t} />
        ))}
      </div>
    </div>
  );
});
