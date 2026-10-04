import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useAuth } from "../../context/AuthContext";
import { useClock } from "../../hooks/useClock";
import { useTheme } from "../../hooks/useTheme";
import { formatDate, formatTime, initials } from "../../lib/format";
import { ROLE_LABELS } from "../../lib/roles";
import { IconButton } from "../ui";
import { IconLogout, IconMoon, IconSun } from "../icons";
import { Logo } from "../brand";
import { useSettings } from "../../context/SettingsContext";
import { ModeTabs, type TabItem } from "./ModeTabs";

/**
 * الترويسة الموحّدة.
 *
 * الترتيب متبع اصطلاح أنظمة نقاط البيع العالمية:
 * **مين إحنا** (العلامة) → **إنت فين** (عنوان الشاشة والتبويبات) →
 * **الجهاز ده إيه** (الفرع والمحطة) → **إمتى** (الساعة) → **إنت مين** (المستخدم).
 * الكاشير بيتأكد من دول بنظرة واحدة قبل ما يفتح وردية.
 */
export function TopBar({
  title,
  subtitle,
  actions,
  tabs,
  activeTab,
  onTabSelect,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  tabs?: TabItem[];
  activeTab?: string;
  onTabSelect?: (id: string) => void;
}) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const now = useClock();
  const { theme, toggle } = useTheme();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className={cn("topbar", (tabs?.length ?? 0) >= 4 && "topbar--crowded")}>
      <a href="#main" className="skip-link">
        تخطّي إلى المحتوى
      </a>

      <div className="topbar__start">
        {/* الشعار = زر الرجوع للشاشة الرئيسية بتاعة الدور */}
        <button
          type="button"
          className="brandbtn"
          onClick={() => navigate("/")}
          aria-label="الشاشة الرئيسية"
        >
          <Logo size="sm" onDark />
        </button>

        <div className="topbar__titles">
          {/* عنوان الصفحة هو h1 — أساس مخطط المستند */}
          <h1 className="topbar__title">{title}</h1>
          {subtitle && <span className="topbar__sub">{subtitle}</span>}
        </div>
      </div>

      {tabs && tabs.length > 0 && activeTab && onTabSelect && (
        <ModeTabs items={tabs} activeId={activeTab} onSelect={onTabSelect} />
      )}

      <div className="topbar__end">
        {actions}

        {/* هوية الجهاز — الفرع والمحطة اللي الفاتورة هتتطبع باسمهم.
            بتختفي لحد ما الأدمن يملا بيانات المحل، بدل ما تعرض فراغ. */}
        {settings.merchant_name && (
          <div
            className="station"
            title={[settings.merchant_name, settings.branch].filter(Boolean).join(" — ")}
          >
            <span className="station__branch">{settings.branch || settings.merchant_name}</span>
            <span className="station__id num">{settings.station}</span>
          </div>
        )}

        <div className="clock" aria-hidden="true">
          <span className="clock__time">{formatTime(now)}</span>
          <span className="clock__date">{formatDate(now)}</span>
        </div>

        <div className="topbar__actions">
          <IconButton
            label={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
            variant="onbar"
            icon={theme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
            onClick={toggle}
          />

          <div className="userchip">
            <span className="userchip__avatar">{initials(user?.name)}</span>
            <span className="userchip__meta">
              <span className="userchip__name">{user?.name}</span>
              <span className="userchip__role">{user ? ROLE_LABELS[user.role] : ""}</span>
            </span>
          </div>

          <IconButton
            label="تسجيل الخروج"
            variant="onbar"
            icon={<IconLogout size={20} />}
            onClick={handleLogout}
          />
        </div>
      </div>
    </header>
  );
}
