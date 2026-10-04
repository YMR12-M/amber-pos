import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import type { TabItem } from "./ModeTabs";

/**
 * هيكل الصفحة الموحّد لكل الشاشات — الهيكل التقليدي لنقطة البيع:
 *
 *   ┌──────── الترويسة: العلامة · التبويبات · الساعة · المستخدم ────────┐
 *   │ لوحة الشيك (يمين) │                 المحتوى                       │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * لوحة الشيك أول عنصر في الـ DOM عشان تقع على اليمين في RTL.
 * `fill` بيخلّي المحتوى يملا الارتفاع من غير سكرول للصفحة — شاشة
 * الكاشير بتسكرول الأقسام والمنيو كلٌّ لوحده.
 */
export function AppShell({
  title,
  subtitle,
  actions,
  sidebar,
  tabs,
  activeTab,
  onTabSelect,
  fill,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  sidebar?: ReactNode;
  tabs?: TabItem[];
  activeTab?: string;
  onTabSelect?: (id: string) => void;
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <TopBar
        title={title}
        subtitle={subtitle}
        actions={actions}
        tabs={tabs}
        activeTab={activeTab}
        onTabSelect={onTabSelect}
      />

      <div className="shell__content">
        {sidebar}

        {/* معلم <main> — نقطة القفز الأساسية لقارئ الشاشة. */}
        <main className={fill ? "shell__body shell__body--fill" : "shell__body"} id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
