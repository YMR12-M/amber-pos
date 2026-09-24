import { BRAND, Logo } from "./brand";

/**
 * شاشة الانتظار — بتظهر أثناء فحص الجلسة أو تحميل شاشة كسولة.
 *
 * مقصود إنها تكمّل شاشة الإقلاع اللي في `index.html`: نفس الخلفية
 * ونفس مكان الشعار، فالانتقال من HTML لـ React مش بيبان كـ"وميض".
 */
export function Splash({ label = "بنجهّز الشاشة…" }: { label?: string }) {
  return (
    <div className="splash brand-canvas" role="status" aria-live="polite">
      <div className="splash__inner">
        <Logo layout="stacked" size="lg" onDark tagline />

        {/* شريط تقدّم غير محدّد — بيقول "شغّال" من غير ما يوعد بمدة */}
        <div className="splash__bar" aria-hidden="true">
          <span />
        </div>

        <span className="splash__label">{label}</span>
        <span className="brand-version brand-version--ondark">
          {BRAND.latin} {BRAND.version}
        </span>
      </div>
    </div>
  );
}
