import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../../../api";
import type { RestaurantTable, TableStatus } from "../../../types";
import { TABLE_STATUS_LABELS } from "../../../types";
import {
  Badge,
  Button,
  Card,
  CardHead,
  EmptyState,
  IconButton,
  Input,
  Select,
  Skeleton,
  Stat,
  useDialog,
  useToast,
} from "../../../components/ui";
import {
  IconEdit,
  IconPlus,
  IconTable,
  IconTrash,
  IconUndo,
} from "../../../components/icons";

const TONE: Record<TableStatus, "ready" | "cancelled" | "pending"> = {
  free: "ready",
  occupied: "cancelled",
  reserved: "pending",
};

const STATUSES = Object.keys(TABLE_STATUS_LABELS) as TableStatus[];

/**
 * الطاولات: إضافة · إعادة تسمية · تغيير الحالة · حذف/أرشفة.
 *
 * الطاولة اللي اتباع عليها قبل كده بتتأرشف بدل ما تتحذف — الفواتير
 * القديمة بتفضل عارفة اسمها، وتقدر ترجّعها للخدمة في أي وقت.
 */
export function TablesManager() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const dialog = useDialog();

  const load = useCallback(async () => {
    try {
      setTables(await api.getTables(true));
    } catch (err) {
      toast.fromError(err, "تعذّر تحميل الطاولات");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(() => tables.filter((t) => t.is_active), [tables]);
  const archived = useMemo(() => tables.filter((t) => !t.is_active), [tables]);

  const counts = useMemo(() => {
    const c: Record<TableStatus, number> = { free: 0, occupied: 0, reserved: 0 };
    for (const t of active) c[t.status]++;
    return c;
  }, [active]);

  async function add(e: FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      await api.createTable(trimmed);
      setLabel("");
      toast.success(`اتضافت "${trimmed}"`);
      await load();
    } catch (err) {
      toast.fromError(err, "فشل إضافة الطاولة");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: number, status: TableStatus) {
    try {
      await api.updateTableStatus(id, status);
    } catch (err) {
      toast.fromError(err, "فشل تحديث الطاولة");
    } finally {
      load();
    }
  }

  async function rename(table: RestaurantTable) {
    const next = await dialog.prompt({
      title: "اسم الطاولة",
      defaultValue: table.label,
      confirmLabel: "احفظ",
    });
    if (next === null) return;

    const trimmed = next.trim();
    if (!trimmed || trimmed === table.label) return;

    try {
      await api.renameTable(table.id, trimmed);
      toast.success("تم تغيير الاسم");
      await load();
    } catch (err) {
      toast.fromError(err, "فشل تغيير الاسم");
    }
  }

  async function remove(table: RestaurantTable) {
    const ok = await dialog.confirm({
      title: `حذف "${table.label}"؟`,
      message:
        "لو عليها فواتير قديمة هتتأرشف بدل ما تتحذف — بتختفي من الصالة والتقارير تفضل صح.",
      confirmLabel: "احذف",
      danger: true,
    });
    if (!ok) return;

    try {
      const res = await api.deleteTable(table.id);
      toast.info(res.message);
      await load();
    } catch (err) {
      toast.fromError(err, "فشل الحذف");
    }
  }

  async function restore(table: RestaurantTable) {
    try {
      await api.restoreTable(table.id);
      toast.success(`رجعت "${table.label}" للخدمة`);
      await load();
    } catch (err) {
      toast.fromError(err, "فشل الاسترجاع");
    }
  }

  return (
    <div className="section">
      <Card pad>
        <CardHead
          title={
            <span className="u-row">
              <IconTable size={17} /> إضافة طاولة
            </span>
          }
        />
        <form onSubmit={add} className="u-row" style={{ alignItems: "flex-end", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Input
              label="اسم الطاولة"
              hint="الاسم ده اللي الكاشير هيختار بيه — مثلاً «طاولة 1» أو «تراس 3»"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={50}
              required
            />
          </div>
          <Button type="submit" variant="primary" loading={saving} icon={<IconPlus size={17} />}>
            إضافة
          </Button>
        </form>
      </Card>

      {loading ? (
        <div className="grid-tiles">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} h={160} r={16} />
          ))}
        </div>
      ) : active.length === 0 ? (
        <EmptyState
          icon={<IconTable size={30} />}
          title="مفيش طاولات لسه"
          text="ضيف طاولات الصالة من فوق. لو بتشتغل تيك أواي بس، تقدر تسيبها فاضية."
        />
      ) : (
        <>
          <div className="grid-stats">
            <Stat label="إجمالي الطاولات" value={active.length} icon={<IconTable size={15} />} />
            <Stat label="متاحة" value={counts.free} accent />
            <Stat label="مشغولة" value={counts.occupied} />
            <Stat label="محجوزة" value={counts.reserved} />
          </div>

          <div className="grid-tiles">
            {active.map((t) => (
              <div key={t.id} className="tabletile" data-status={t.status}>
                <div className="u-between">
                  <span className="tabletile__label">{t.label}</span>
                  <Badge tone={TONE[t.status]} dot>
                    {TABLE_STATUS_LABELS[t.status]}
                  </Badge>
                </div>

                {t.active_order_id && (
                  <span className="u-muted" style={{ fontSize: "var(--fs-xs)", fontWeight: 700 }}>
                    طلب مفتوح #{t.active_order_id}
                  </span>
                )}

                <div className="tabletile__foot">
                  <Select
                    value={t.status}
                    onChange={(e) => setStatus(t.id, e.target.value as TableStatus)}
                    aria-label={`حالة ${t.label}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {TABLE_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                  <IconButton
                    label={`تعديل اسم ${t.label}`}
                    variant="plain"
                    icon={<IconEdit size={17} />}
                    onClick={() => rename(t)}
                  />
                  <IconButton
                    label={`حذف ${t.label}`}
                    variant="plain"
                    icon={<IconTrash size={17} />}
                    onClick={() => remove(t)}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {archived.length > 0 && (
        <>
          <div className="section__head">
            <h2 className="section__title">
              مؤرشفة <span className="u-muted num">({archived.length})</span>
            </h2>
            <span className="section__desc">بره الخدمة — فواتيرها القديمة محفوظة</span>
          </div>

          <div className="grid-tiles">
            {archived.map((t) => (
              <div key={t.id} className="tabletile tabletile--archived" data-status="free">
                <div className="u-between">
                  <span className="tabletile__label">{t.label}</span>
                  <Badge tone="pending">مؤرشفة</Badge>
                </div>
                <div className="tabletile__foot">
                  <Button
                    size="sm"
                    variant="soft"
                    icon={<IconUndo size={16} />}
                    onClick={() => restore(t)}
                  >
                    رجّعها للخدمة
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
