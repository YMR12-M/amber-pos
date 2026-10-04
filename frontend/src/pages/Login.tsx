import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HOME_FOR_ROLE } from "../lib/roles";
import { api } from "../api";
import type { PublicSettings } from "../types";
import { BRAND, Logo } from "../components/brand";
import { Button, IconButton, Input } from "../components/ui";
import { IconAlert, IconEye, IconEyeOff, IconLock } from "../components/icons";

/** الوعد مقسّم لتلات جُمل — واحدة لكل دور في النظام. */
const PILLARS = [
  "الطلب بيتسجّل في ثواني",
  "المطبخ بيشوفه في نفس اللحظة",
  "أرقام الوردية قدامك دايماً",
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [station, setStation] = useState<PublicSettings | null>(null);

  /* اسم المحل والمحطة قبل تسجيل الدخول — الموظف يتأكد إنه على الجهاز
     الصح قبل ما يكتب بياناته. الـ endpoint بيرجّع الاسم بس، مفيش أرقام
     حساسة. فشل التحميل بيتجاهَل: النموذج المهم شغّال في كل الحالات. */
  useEffect(() => {
    let cancelled = false;
    api
      .getPublicSettings()
      .then((s) => {
        if (!cancelled && s.merchant_name.trim()) setStation(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      navigate(HOME_FOR_ROLE[user.role], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "حصل خطأ، حاول تاني");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login brand-canvas">
      {/* تذكرة بكعب: الكعب العنبري للهوية، والورقة للنموذج، وبينهم تقطيع.
          الاصطلاح العالمي في شاشات دخول نقاط البيع: نص للهوية ونص للنموذج —
          الهوية بتطمّن الموظف إنه على الجهاز الصح قبل ما يكتب بياناته،
          وده مهم لما يكون في أكتر من فرع. الورقة `theme-light` دايماً:
          هي الحاجة المضيئة في الشاشة الداكنة، حتى في الوضع الليلي. */}
      <div className="stub theme-light">
        <section className="stub__brand">
          <Logo layout="inline" size="md" />

          <p className="stub__promise">{BRAND.promise}</p>

          <ol className="stub__list">
            {PILLARS.map((text, i) => (
              <li key={text}>
                <span className="stub__list-no">{String(i + 1).padStart(2, "0")}</span>
                {text}
              </li>
            ))}
          </ol>

          {station && (
            <div className="stub__station">
              <span className="stub__station-name">{station.merchant_name}</span>
              <span className="stub__station-meta num">
                {[station.branch, station.station].filter(Boolean).join(" · ")}
              </span>
              <div className="stub__barcode" aria-hidden="true" />
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="stub__form">
          <div className="stub__head">
            <h1 className="stub__title">تسجيل الدخول</h1>
            <p className="stub__sub">ادخل ببيانات حسابك عشان تفتح الوردية</p>
          </div>

          <Input
            label="البريد الإلكتروني"
            type="email"
            dir="ltr"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div style={{ position: "relative" }}>
            <Input
              label="كلمة المرور"
              type={showPassword ? "text" : "password"}
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {/* الحقل dir=ltr، فالزر لازم يبقى على الجنب المقابل للنص.
                المقاس أرضية اللمس (44px) — الحقل نفسه 48px فبيقع جوّاه. */}
            <div style={{ position: "absolute", insetInlineStart: 2, top: 24 }}>
              <IconButton
                label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                variant="plain"
                icon={showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                onClick={() => setShowPassword((v) => !v)}
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="stub__alert">
              <IconAlert size={18} />
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" block loading={loading}>
            {loading ? "جاري الدخول…" : "دخول"}
          </Button>

          <div className="stub__foot">
            <span className="u-row" style={{ justifyContent: "center" }}>
              <IconLock size={13} /> جلسة مؤمّنة — الكوكي httpOnly
            </span>
            <span className="brand-version">
              {BRAND.latin} {BRAND.version}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
