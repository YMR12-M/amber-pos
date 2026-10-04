import { memo } from "react";
import type { RestaurantTable } from "../../../types";
import { TABLE_STATUS_LABELS } from "../../../types";
import { orderNo } from "../../../components/brand";

/**
 * شكل الطاولة (مربّعة / دايرية) بيتحدّد من الـ id — زخرفي بس.
 * السيستم مش بيخزّن سعة ولا مكان الطاولة، فالرسمة ما بتدّعيش أي معلومة.
 */
const isRound = (id: number) => id % 3 === 0;

/** الطاولة من فوق: سطح وكراسي. اللون من حالة الطاولة (CSS). */
export function TableFigure({ round }: { round: boolean }) {
  return (
    <svg className="tablefig" viewBox="0 0 120 92" aria-hidden="true" focusable="false">
      <g className="tablefig__chairs">
        {round ? (
          <>
            <rect x="49" y="5" width="22" height="10" rx="4" />
            <rect x="49" y="77" width="22" height="10" rx="4" />
            <rect x="18" y="36" width="10" height="20" rx="4" />
            <rect x="92" y="36" width="10" height="20" rx="4" />
          </>
        ) : (
          <>
            <rect x="30" y="7" width="24" height="10" rx="4" />
            <rect x="66" y="7" width="24" height="10" rx="4" />
            <rect x="30" y="75" width="24" height="10" rx="4" />
            <rect x="66" y="75" width="24" height="10" rx="4" />
          </>
        )}
      </g>
      {round ? (
        <circle className="tablefig__top" cx="60" cy="46" r="27" />
      ) : (
        <rect className="tablefig__top" x="21" y="22" width="78" height="48" rx="7" />
      )}
      <circle className="tablefig__candle" cx="60" cy="46" r="3.2" />
    </svg>
  );
}

function Face({ table }: { table: RestaurantTable }) {
  return (
    <>
      <TableFigure round={isRound(table.id)} />
      <span className="tabletile__label">{table.label}</span>
      <span className="tabletile__state">
        <span className="tabletile__lamp" aria-hidden="true" />
        {TABLE_STATUS_LABELS[table.status]}
        {table.active_order_id && (
          <span className="num tabletile__order"> · {orderNo(table.active_order_id)}</span>
        )}
      </span>
    </>
  );
}

/**
 * الطاولة على خريطة القاعة.
 * - `map`  عرض بس (div).
 * - `pick` زر لاختيار الطاولة في الكاشير — المتاحة بس هي اللي بتتضغط.
 */
export const TableTile = memo(function TableTile({
  table,
  mode = "map",
  selected,
  archived,
  onPick,
}: {
  table: RestaurantTable;
  mode?: "map" | "pick";
  selected?: boolean;
  archived?: boolean;
  onPick?: (table: RestaurantTable) => void;
}) {
  const className = `tabletile${archived ? " tabletile--archived" : ""}`;

  if (mode === "pick") {
    return (
      <button
        type="button"
        className={className}
        data-status={table.status}
        data-selected={selected || undefined}
        disabled={table.status !== "free"}
        aria-pressed={selected}
        onClick={() => onPick?.(table)}
      >
        <Face table={table} />
      </button>
    );
  }

  return (
    <div className={className} data-status={table.status}>
      <Face table={table} />
    </div>
  );
});
