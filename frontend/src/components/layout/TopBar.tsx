import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { useClock } from "../../hooks/useClock";
import { useTheme } from "../../hooks/useTheme";
import { formatDate, formatTime, initials } from "../../lib/format";
import { ROLE_LABELS } from "../../lib/roles";
import { IconButton } from "../ui";
import { IconLogout, IconMoon, IconSun } from "../icons";
import { Logo } from "../brand";
import { useSettings } from "../../context/SettingsContext";

/**
 * الترويسة الموحّدة.
 *
 * الترتيب متبع اصطلاح أنظمة نقاط البيع العالمية:
 * **مين إحنا** (العلامة) → **إنت فين** (عنوان الشاشة) →
 * **الجهاز ده إيه** (الفرع والمحطة) → **إمتى** (الساعة) → **إنت مين** (المستخدم).
 * الكاشير بيتأكد من الأربعة دول بنظرة واحدة قبل ما يفتح وردية.
 */
export function TopBar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
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
    <header className="topbar">
      <a href="#main" className="skip-link">
        تخطّي إلى المحتوى
      </a>

      {/* الشعار = زر الرجوع للشاشة الرئيسية بتاعة الدور */}
      <button
        type="button"
        className="logo__home"
        onClick={() => navigate("/")}
        aria-label="الشاشة الرئيسية"
      >
        <Logo size="sm" />
      </button>

      <div className="topbar__divider" />

      <div className="topbar__titles">
        {/* عنوان الصفحة هو h1 — أساس مخطط المستند */}
        <h1 className="topbar__title">{title}</h1>
        {subtitle && <span className="topbar__sub">{subtitle}</span>}
      </div>

      <div className="topbar__spacer" />

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

      <div className="topbar__divider" />

      <div className="topbar__actions">
        <IconButton
          label={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          variant="plain"
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
          variant="plain"
          icon={<IconLogout size={20} />}
          onClick={handleLogout}
        />
      </div>
    </header>
  );
}
