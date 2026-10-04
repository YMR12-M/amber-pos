import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SalesDay } from "../../../types";
import { formatDay, int, money } from "../../../lib/format";
import { useSettings } from "../../../context/SettingsContext";

const PAD = { top: 18, right: 14, bottom: 26, left: 56 };
const HEIGHT = 240;

interface Point {
  x: number;
  y: number;
  day: SalesDay;
  value: number;
}

/**
 * منحنى المبيعات اليومية — سلسلة واحدة، فمفيش legend
 * (العنوان بيسمّيها) وفيه crosshair + tooltip عند المرور.
 * الجدول تحت هو الـ table view للقراءة الدقيقة.
 */
export function SalesChart({ daily }: { daily: SalesDay[] }) {
  const { currency } = useSettings();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { points, ticks, max, peakIndex, areaPath, linePath } = useMemo(() => {
    const values = daily.map((d) => Number(d.total_sales) || 0);
    const rawMax = Math.max(...values, 1);
    // سقف مريح للعين بدل الرقم الخام
    const step = Math.pow(10, Math.floor(Math.log10(rawMax))) / 2 || 1;
    const maxV = Math.ceil(rawMax / step) * step;

    const innerW = Math.max(width - PAD.left - PAD.right, 10);
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const denom = Math.max(daily.length - 1, 1);

    const pts: Point[] = daily.map((day, i) => {
      const value = Number(day.total_sales) || 0;
      return {
        x: PAD.left + (daily.length === 1 ? innerW / 2 : (innerW * i) / denom),
        y: PAD.top + innerH * (1 - value / maxV),
        day,
        value,
      };
    });

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const base = PAD.top + innerH;
    const area = pts.length
      ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`
      : "";

    return {
      points: pts,
      max: maxV,
      ticks: [0, 0.25, 0.5, 0.75, 1].map((t) => ({
        y: PAD.top + innerH * (1 - t),
        label: maxV * t,
      })),
      peakIndex: values.indexOf(Math.max(...values)),
      linePath: line,
      areaPath: area,
    };
  }, [daily, width]);

  const onMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (points.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const d = Math.abs(points[i].x - x);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      setHover(best);
    },
    [points]
  );

  if (daily.length === 0) return null;

  const active = hover !== null ? points[hover] : null;
  const peak = points[peakIndex];

  return (
    <div className="viz" ref={wrapRef}>
      <svg
        className="viz__svg"
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={`مبيعات ${daily.length} يوم، أعلى يوم ${money(peak?.value ?? 0)} جنيه`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          {/* تظليل بشرائط مائلة — زي الحفر على الورق، مش تدرّج */}
          <pattern id="viz-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--viz-trend)" strokeWidth="2" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* شبكة خافتة + محور القيم */}
        {ticks.map((t) => (
          <g key={t.y}>
            <line className="viz__grid" x1={PAD.left} y1={t.y} x2={width - PAD.right} y2={t.y} />
            <text className="viz__axis" x={PAD.left - 10} y={t.y + 4} textAnchor="end">
              {int(t.label)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#viz-hatch)" />
        <path className="viz__line" d={linePath} />

        {/* علامة أعلى يوم — تسمية مباشرة بدل رقم على كل نقطة */}
        {peak && (
          <>
            <circle className="viz__dot" cx={peak.x} cy={peak.y} r={5} />
            <text
              className="viz__peak"
              x={peak.x}
              y={peak.y - 12}
              textAnchor={peak.x > width - 80 ? "end" : peak.x < 80 ? "start" : "middle"}
            >
              {money(peak.value)}
            </text>
          </>
        )}

        {/* تسميات المحور الزمني — واحدة كل شوية عشان ما يتزاحموش */}
        {points.map((p, i) => {
          const every = Math.ceil(points.length / 7);
          if (i % every !== 0 && i !== points.length - 1) return null;
          return (
            <text
              key={p.day.day}
              className="viz__axis"
              x={p.x}
              y={HEIGHT - 8}
              textAnchor={i === points.length - 1 ? "end" : i === 0 ? "start" : "middle"}
            >
              {formatDay(p.day.day)}
            </text>
          );
        })}

        {active && (
          <>
            <line
              className="viz__crosshair"
              x1={active.x}
              y1={PAD.top}
              x2={active.x}
              y2={HEIGHT - PAD.bottom}
            />
            <circle className="viz__dot" cx={active.x} cy={active.y} r={6} />
          </>
        )}

        {/* مساحات لمس أعرض من النقط نفسها */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.day.day}`}
            x={p.x - Math.max(width / points.length / 2, 8)}
            y={PAD.top}
            width={Math.max(width / points.length, 16)}
            height={HEIGHT - PAD.top - PAD.bottom}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {active && (
        <div className="viz__tip" style={{ left: active.x, top: active.y }}>
          <div className="viz__tip-day">{formatDay(active.day.day)}</div>
          <div className="viz__tip-val">
            {money(active.value)} {currency}
          </div>
          <div className="viz__tip-sub">{int(active.day.orders_count)} طلب</div>
        </div>
      )}

      <span className="sr-only">
        أعلى قيمة على المحور {int(max)} جنيه.
      </span>
    </div>
  );
}
