import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { Dock, type DockItem } from "./Dock";

/**
 * هيكل الصفحة الموحّد لكل الشاشات:
 *
 *   ┌──────────────── TopBar (بعرض الشاشة) ────────────────┐
 *   │ Sidebar (يمين) │           المحتوى                   │
 *   │                │        … + Dock عائم تحت            │
 *   └──────────────────────────────────────────────────────┘
 *
 * السايدبار أول عنصر في الـ DOM عشان يقع على اليمين في RTL،
 * والدوك جوه عمود المحتوى عشان يتوسّطه هو مش الشاشة كلها.
 */
export function AppShell({
  title,
  subtitle,
  actions,
  sidebar,
  dockItems,
  activeDockId,
  onDockSelect,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  sidebar?: ReactNode;
  dockItems?: DockItem[];
  activeDockId?: string;
  onDockSelect?: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <TopBar title={title} subtitle={subtitle} actions={actions} />

      <div className="shell__content">
        {sidebar}

        <div className="shell__main">
          {/* معلم <main> — نقطة القفز الأساسية لقارئ الشاشة.
              الدوك بره عشان التنقّل مايبقاش جوه المحتوى الرئيسي. */}
          <main className="shell__body" id="main">
            {children}
          </main>

          {dockItems && dockItems.length > 0 && activeDockId && onDockSelect && (
            <Dock items={dockItems} activeId={activeDockId} onSelect={onDockSelect} />
          )}
        </div>
      </div>
    </div>
  );
}
