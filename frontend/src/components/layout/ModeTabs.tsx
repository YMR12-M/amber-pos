import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useRovingFocus } from "../../hooks/useRovingFocus";

export interface TabItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** عدّاد صغير على التبويب (زي عدد الطلبات المفتوحة) */
  badge?: number;
}

/**
 * تبويبات الشاشة — الاصطلاح التقليدي في نقاط البيع: صف تبويبات في الترويسة،
 * والتبويب النشط بيطلع زي تبويب الملف الورقي ويكمل في المحتوى اللي تحته.
 *
 * الدلالات: `<nav>` + `aria-current` — مش tablist، لأن المحتوى مش متعلّم
 * كـ tabpanel، فادعاء tabs كان هيبقى وعد كاذب لقارئ الشاشة.
 * الأسهم بتنقّل بين التبويبات و Home/End بيروحوا للطرفين (بيتقلبوا في RTL).
 */
export function ModeTabs({
  items,
  activeId,
  onSelect,
  label = "التنقّل بين شاشات النظام",
}: {
  items: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  label?: string;
}) {
  const activeIndex = Math.max(
    0,
    items.findIndex((i) => i.id === activeId)
  );
  const onKeyDown = useRovingFocus(items.length, activeIndex, (next) =>
    onSelect(items[next].id)
  );

  return (
    <nav
      className={cn("modetabs", items.length >= 4 && "modetabs--dense")}
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            aria-label={item.badge ? `${item.label} — ${item.badge}` : item.label}
            title={item.label}
            className={cn("modetab", isActive && "is-active")}
            onClick={() => onSelect(item.id)}
          >
            <span className="modetab__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="modetab__label">{item.label}</span>
            {!!item.badge && (
              <span className="modetab__badge" aria-hidden="true">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
