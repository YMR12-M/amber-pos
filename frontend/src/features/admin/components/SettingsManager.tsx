import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../../api";
import type { Settings } from "../../../types";
import { useSettings } from "../../../context/SettingsContext";
import { Button, Card, CardHead, Input, Skeleton, useToast } from "../../../components/ui";
import { IconAlert, IconReceipt, IconSettings } from "../../../components/icons";

/** 0.14 ↔ "14" — الأدمن بيكتب نسبة مئوية، القاعدة بتخزّن كسر عشري. */
const toPercent = (rate: number) => String(Math.round(rate * 10000) / 100);
const fromPercent = (value: string) => Math.round(Number(value) * 100) / 10000;

interface FormState extends Omit<Settings, "tax_rate"> {
  tax_percent: string;
}

function toForm(s: Settings): FormState {
  const { tax_rate, ...rest } = s;
  return { ...rest, tax_percent: toPercent(tax_rate) };
}

/**
 * بيانات المنشأة.
 *
 * الشاشة دي هي اللي بتخلي النظام بتاع المحل ده بالذات: الاسم والعنوان
 * والرقم الضريبي اللي بيتطبعوا على كل فاتورة، ونسبة الضريبة اللي
 * السيرفر بيحسب بيها. من غيرها الفاتورة بتطلع بترويسة فاضية.
 */
export function SettingsManager() {
  const { settings, loading: loadingSettings, apply } = useSettings();
  const [form, setForm] = useState<FormState>(() => toForm(settings));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();

  // أول ما الإعدادات توصل من السيرفر بنملا النموذج — إلا لو المستخدم
  // بدأ يكتب فعلاً، عشان ما نمسحش شغله تحت إيده.
  useEffect(() => {
    if (!dirty) setForm(toForm(settings));
  }, [settings, dirty]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const percent = Number(form.tax_percent);
    if (!Number.isFinite(percent) || percent < 0) {
      toast.error("نسبة الضريبة لازم تكون رقم موجب");
      return;
    }

    setSaving(true);
    try {
      const { tax_percent, ...rest } = form;
      const { settings: saved } = await api.saveSettings({
        ...rest,
        tax_rate: fromPercent(tax_percent),
      });
      apply(saved);
      setForm(toForm(saved));
      setDirty(false);
      toast.success("اتحفظت بيانات المحل");
    } catch (err) {
      toast.fromError(err, "فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  }

  if (loadingSettings) {
    return (
      <Card pad>
        <div className="u-col" style={{ gap: 14 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} h={48} />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="section">
      {!settings.merchant_name && (
        <div role="status" className="notice notice--warn">
          <IconAlert size={18} />
          <span>
            لسه ما دخّلتش بيانات المحل. الفاتورة بتطبع من غير اسم ولا عنوان لحد ما تحفظهم هنا.
          </span>
        </div>
      )}

      <Card pad>
        <CardHead title={<span className="u-row"><IconSettings size={17} /> بيانات المحل</span>} />

        <div className="form-grid">
          <Input
            label="اسم المحل"
            hint="بيتطبع أول سطر في الفاتورة"
            value={form.merchant_name}
            onChange={(e) => set("merchant_name", e.target.value)}
            maxLength={120}
            required
          />
          <Input
            label="الفرع"
            hint="سيبه فاضي لو فرع واحد"
            value={form.branch}
            onChange={(e) => set("branch", e.target.value)}
            maxLength={120}
          />
          <Input
            label="العنوان"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            maxLength={200}
          />
          <Input
            label="التليفون"
            dir="ltr"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            maxLength={40}
          />
          <Input
            label="الرقم الضريبي"
            dir="ltr"
            hint="إلزامي على الفاتورة في أغلب الأسواق"
            value={form.tax_id}
            onChange={(e) => set("tax_id", e.target.value)}
            maxLength={40}
          />
          <Input
            label="رقم المحطة"
            dir="ltr"
            hint="بيربط الفاتورة بجهاز الكاشير — مثلاً POS-01"
            value={form.station}
            onChange={(e) => set("station", e.target.value)}
            maxLength={20}
            required
          />
        </div>
      </Card>

      <Card pad>
        <CardHead title={<span className="u-row"><IconReceipt size={17} /> الفاتورة والحساب</span>} />

        <div className="form-grid">
          <Input
            label="رمز العملة"
            hint="بيظهر جنب كل رقم في النظام"
            value={form.currency}
            onChange={(e) => set("currency", e.target.value)}
            maxLength={10}
            required
          />
          <Input
            label="نسبة الضريبة %"
            type="number"
            dir="ltr"
            min="0"
            max="50"
            step="0.01"
            inputMode="decimal"
            hint="بتتحسب على كل طلب جديد. صفر = من غير ضريبة."
            value={form.tax_percent}
            onChange={(e) => set("tax_percent", e.target.value)}
            required
          />
        </div>

        <Input
          label="سطر الشكر في آخر الفاتورة"
          value={form.receipt_footer}
          onChange={(e) => set("receipt_footer", e.target.value)}
          maxLength={200}
        />

        <p className="u-muted" style={{ fontSize: "var(--fs-xs)", marginTop: 4 }}>
          تغيير نسبة الضريبة بيأثر على الطلبات الجديدة بس — الفواتير القديمة بتفضل بنسبتها
          اللي اتحسبت بيها.
        </p>
      </Card>

      <div className="u-row" style={{ justifyContent: "flex-start" }}>
        <Button type="submit" variant="primary" size="lg" loading={saving} disabled={!dirty}>
          {saving ? "جاري الحفظ…" : "حفظ الإعدادات"}
        </Button>
        {dirty && <span className="u-muted">في تعديلات ما اتحفظتش</span>}
      </div>
    </form>
  );
}
