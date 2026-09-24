import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout";
import { Button } from "../components/ui";
import {
  IconChart,
  IconChef,
  IconGrid,
  IconRegister,
  IconSettings,
  IconTable,
  IconUsers,
} from "../components/icons";
import { useSettings } from "../context/SettingsContext";
import { MenuManager } from "../features/admin/components/MenuManager";
import { TablesManager } from "../features/admin/components/TablesManager";
import { StaffManager } from "../features/admin/components/StaffManager";
import { SalesReport } from "../features/admin/components/SalesReport";
import { SettingsManager } from "../features/admin/components/SettingsManager";

type Tab = "reports" | "menu" | "tables" | "staff" | "settings";

const SUBTITLES: Record<Tab, string> = {
  reports: "أرقام المبيعات وأداء الفترة",
  menu: "الأقسام والأصناف والأسعار",
  tables: "حالة القاعة والطاولات",
  staff: "الحسابات والصلاحيات",
  settings: "بيانات المحل والفاتورة والضريبة",
};

/** لوحة تحكم صاحب المحل — كل تبويب في ملف لوحده تحت features/admin. */
export default function Admin() {
  const { needsSetup } = useSettings();
  const [tab, setTab] = useState<Tab>("reports");
  const navigate = useNavigate();

  /* محل جديد بيفتح على الإعدادات: الفاتورة ما تطبعش من غير اسم المحل.
     ده لازم يكون effect مش قيمة أوّلية لـ useState — الإعدادات لسه
     بتتحمّل وقت أول رسمة، فـ `needsSetup` بيبقى false دايماً وقتها
     والتحويل كان عمره ما بيحصل. و`redirected` بيضمن إنه يحصل مرة
     واحدة، فالأدمن اللي بيسيب الإعدادات فاضية عن قصد ما يتحبسش فيها. */
  const redirected = useRef(false);
  useEffect(() => {
    if (needsSetup && !redirected.current) {
      redirected.current = true;
      setTab("settings");
    }
  }, [needsSetup]);

  const dockItems = useMemo(
    () => [
      { id: "reports", label: "التقارير", icon: <IconChart /> },
      { id: "menu", label: "المنيو", icon: <IconGrid /> },
      { id: "tables", label: "الطاولات", icon: <IconTable /> },
      { id: "staff", label: "الموظفين", icon: <IconUsers /> },
      { id: "settings", label: "الإعدادات", icon: <IconSettings /> },
    ],
    []
  );

  return (
    <AppShell
      title="لوحة التحكم"
      subtitle={SUBTITLES[tab]}
      actions={
        <>
          <Button
            size="sm"
            variant="soft"
            icon={<IconRegister size={17} />}
            onClick={() => navigate("/pos")}
          >
            نقطة البيع
          </Button>
          <Button
            size="sm"
            variant="soft"
            icon={<IconChef size={17} />}
            onClick={() => navigate("/kitchen")}
          >
            المطبخ
          </Button>
        </>
      }
      dockItems={dockItems}
      activeDockId={tab}
      onDockSelect={(id) => setTab(id as Tab)}
    >
      {tab === "reports" && <SalesReport />}
      {tab === "menu" && <MenuManager />}
      {tab === "tables" && <TablesManager />}
      {tab === "staff" && <StaffManager />}
      {tab === "settings" && <SettingsManager />}
    </AppShell>
  );
}
