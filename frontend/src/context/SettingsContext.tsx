import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api";
import type { Settings } from "../types";
import { MERCHANT_FALLBACK } from "../components/brand";
import { useAuth } from "./AuthContext";

/**
 * بيانات المنشأة — مصدر واحد لكل الشاشات.
 *
 * قبل كده كانت مكتوبة في `brand.ts` كنص ثابت، فأي محل بينشر النظام كان
 * لازم يعدّل الكود. دلوقتي بتتحمّل من `/api/settings` وبتتحدّث لحظياً
 * لما الأدمن يحفظ من تبويب الإعدادات — الفاتورة والتوب بار بيتغيّروا
 * من غير إعادة تحميل.
 */
export const EMPTY_SETTINGS: Settings = {
  merchant_name: MERCHANT_FALLBACK.name,
  branch: MERCHANT_FALLBACK.branch,
  address: MERCHANT_FALLBACK.address,
  phone: MERCHANT_FALLBACK.phone,
  tax_id: MERCHANT_FALLBACK.taxId,
  station: MERCHANT_FALLBACK.station,
  currency: MERCHANT_FALLBACK.currency,
  tax_rate: 0,
  receipt_footer: MERCHANT_FALLBACK.thanks,
};

interface SettingsContextValue {
  settings: Settings;
  /** رمز العملة الجاهز للعرض — اختصار بيتكرر في كل شاشة. */
  currency: string;
  loading: boolean;
  /** لسه محدش ملا بيانات المحل — بنبّه الأدمن عشان الفاتورة ما تطلعش بلا اسم. */
  needsSetup: boolean;
  apply: (next: Settings) => void;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setSettings(await api.getSettings());
    } catch {
      // فشل التحميل ما بيوقفش الشغل: الشاشات بتشتغل بالقيم الفاضية،
      // والفاتورة بتطبع من غير ترويسة بدل ما الكاشير يقف.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setSettings(EMPTY_SETTINGS);
      setLoading(false);
      return;
    }
    setLoading(true);
    void reload();
  }, [user, reload]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      currency: settings.currency || MERCHANT_FALLBACK.currency,
      loading,
      needsSetup: !loading && Boolean(user) && settings.merchant_name.trim() === "",
      apply: setSettings,
      reload,
    }),
    [settings, loading, user, reload]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
