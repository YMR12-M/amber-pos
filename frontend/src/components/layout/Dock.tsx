import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useRovingFocus } from "../../hooks/useRovingFocus";

export interface DockItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** عدّاد صغير فوق الأيقونة (زي عدد الطلبات المفتوحة) */
  badge?: number;
}

const LIFT_SIZE = 62;

/**
 * شريط التنقل العائم.
 *
 * العنصر النشط "بيطلع" من الشريط جوه دايرة بيضة، والدايرة بتزحلق
 * للعنصر الجديد بحركة نابضة. القصّة في الشريط متعملة بحلقة ظل
 * (box-shadow) بلون خلفية الصفحة — من غير SVG masks ولا صور.
 *
 * الدلالات: `<nav>` + `aria-current` — مش tablist، لأن المحتوى
 * مش متعلّم كـ tabpanel، فادعاء tabs كان هيبقى وعد كاذب لقارئ الشاشة.
 */
export function Dock({
  items,
  activeId,
  onSelect,
}: {
  items: DockItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const dockRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef(new Map<string, HTMLButtonElement>());
  const [liftX, setLiftX] = useState(0);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    const dock = dockRef.current;
    const btn = btnRefs.current.get(activeId);
    if (!dock || !btn) return;
    const d = dock.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    setLiftX(b.left - d.left + b.width / 2 - LIFT_SIZE / 2);
    setReady(true);
  }, [activeId]);

  useLayoutEffect(measure, [measure, items.length]);

  // إعادة القياس عند تغيّر المقاس أو الخط
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const ro = new ResizeObserver(measure);
    ro.observe(dock);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  const activeIndex = Math.max(
    0,
    items.findIndex((i) => i.id === activeId)
  );
  const onKeyDown = useRovingFocus(items.length, activeIndex, (next) =>
    onSelect(items[next].id)
  );

  const active = items[activeIndex];

  return (
    <div className="dock-wrap">
      <nav className="dock" ref={dockRef} aria-label="التنقّل بين شاشات النظام">
        <div
          className="dock__lift"
          data-ready={ready}
          aria-hidden="true"
          style={{ ["--lift-x" as string]: `${liftX}px` }}
        >
          <span className="dock__lift-icon" key={activeId}>
            {active?.icon}
          </span>
        </div>

        <div className="dock__items" onKeyDown={onKeyDown}>
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                aria-label={
                  item.badge ? `${item.label} — ${item.badge}` : item.label
                }
                title={item.label}
                ref={(el) => {
                  if (el) btnRefs.current.set(item.id, el);
                  else btnRefs.current.delete(item.id);
                }}
                className={cn("dock__item", isActive && "is-active")}
                onClick={() => onSelect(item.id)}
              >
                <span className="dock__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="dock__label">{item.label}</span>
                {!!item.badge && (
                  <span className="dock__badge" aria-hidden="true">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
