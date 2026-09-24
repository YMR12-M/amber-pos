import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../../../api";
import type { Category, MenuItem } from "../../../types";
import { money } from "../../../lib/format";
import { useSettings } from "../../../context/SettingsContext";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  SearchInput,
  Select,
  Skeleton,
  useDialog,
  useToast,
} from "../../../components/ui";
import { IconEdit, IconGrid, IconPlus, IconPower, IconTrash } from "../../../components/icons";
import { CategoryManager } from "./CategoryManager";

/** إدارة المنيو: الأقسام · إضافة صنف · تعديل · تفعيل/إيقاف · حذف. */
export function MenuManager() {
  const { currency } = useSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  const toast = useToast();
  const dialog = useDialog();

  const load = useCallback(async () => {
    try {
      const [cats, menu] = await Promise.all([api.getCategories(), api.getMenuItems()]);
      setCategories(cats);
      setItems(menu);
      // لو القسم المختار اتحذف، بنرجع لأول قسم متاح بدل ما الفورم يبوظ.
      setCategoryId((current) =>
        cats.some((c) => c.id === current) ? current : (cats[0]?.id ?? "")
      );
    } catch (err) {
      toast.fromError(err, "تعذّر تحميل المنيو");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: number) => map.get(id) ?? "—";
  }, [categories]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price || !categoryId) return;

    setSaving(true);
    try {
      await api.createMenuItem({
        category_id: Number(categoryId),
        name: name.trim(),
        price: Number(price),
        description: description.trim() || null,
      });
      setName("");
      setPrice("");
      setDescription("");
      toast.success(`تمت إضافة "${name.trim()}"`);
      await load();
    } catch (err) {
      toast.fromError(err, "فشل إضافة الصنف");
    } finally {
      setSaving(false);
    }
  }

  /** تغيير السعر هو أكتر تعديل بيتعمل في المطعم — فله زرار مباشر. */
  async function editPrice(item: MenuItem) {
    const next = await dialog.prompt({
      title: `سعر "${item.name}"`,
      message: `السعر الحالي: ${money(item.price)} ${currency}`,
      label: `السعر الجديد (${currency})`,
      type: "number",
      defaultValue: String(Number(item.price)),
      confirmLabel: "احفظ",
    });
    if (next === null) return;

    const value = Number(next);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("السعر لازم يكون رقم أكبر من صفر");
      return;
    }

    try {
      await api.updateMenuItem(item.id, { price: value });
      toast.success("تم تحديث السعر");
      await load();
    } catch (err) {
      toast.fromError(err, "فشل تحديث السعر");
    }
  }

  async function toggle(item: MenuItem) {
    try {
      await api.toggleMenuItem(item.id);
      await load();
    } catch (err) {
      toast.fromError(err);
    }
  }

  async function remove(item: MenuItem) {
    const ok = await dialog.confirm({
      title: `حذف "${item.name}"؟`,
      message:
        "لو الصنف اتباع قبل كده، السيرفر هيرفض الحذف عشان التقارير تفضل صح — استخدم «إيقاف».",
      confirmLabel: "احذف",
      danger: true,
    });
    if (!ok) return;

    try {
      await api.deleteMenuItem(item.id);
      toast.info(`تم حذف "${item.name}"`);
      await load();
    } catch (err) {
      toast.fromError(err, "فشل الحذف");
    }
  }

  const noCategories = !loading && categories.length === 0;

  return (
    <div className="section">
      <CategoryManager categories={categories} items={items} onChanged={load} />

      <Card pad>
        <form onSubmit={handleAdd} className="form-grid" style={{ marginBottom: 0 }}>
          <Select
            label="القسم"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            disabled={noCategories}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="اسم الصنف"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            disabled={noCategories}
            required
          />
          <Input
            label={`السعر (${currency})`}
            type="number"
            dir="ltr"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={noCategories}
            required
          />
          <Input
            label="الوصف (اختياري)"
            hint="بيظهر تحت الاسم في شاشة الكاشير"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            disabled={noCategories}
          />
          <div style={{ alignSelf: "end", paddingBottom: 18 }}>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={noCategories}
              icon={<IconPlus size={18} />}
            >
              إضافة الصنف
            </Button>
          </div>
        </form>

        {noCategories && (
          <p className="u-muted" style={{ fontSize: "var(--fs-sm)" }}>
            اعمل قسم الأول من فوق، وبعدين تقدر تضيف أصناف جوّاه.
          </p>
        )}
      </Card>

      <div className="section__head">
        <h2 className="section__title">
          الأصناف <span className="u-muted num">({items.length})</span>
        </h2>
        <SearchInput
          placeholder="دوّر على صنف…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <Card pad>
          <div className="u-col" style={{ gap: 12 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} h={38} />
            ))}
          </div>
        </Card>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<IconGrid size={30} />}
          title={items.length === 0 ? "المنيو لسه فاضي" : "مفيش صنف بالاسم ده"}
          text={
            items.length === 0
              ? "ابدأ بإضافة أول صنف من الفورم فوق."
              : "جرّب كلمة تانية أو امسح البحث."
          }
        />
      ) : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>القسم</th>
                  <th>السعر</th>
                  <th>الحالة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700 }}>{item.name}</td>
                    <td className="u-muted">{categoryName(item.category_id)}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {money(item.price)} {currency}
                    </td>
                    <td>
                      <Badge tone={item.is_available ? "ready" : "cancelled"} dot>
                        {item.is_available ? "متاح" : "غير متاح"}
                      </Badge>
                    </td>
                    <td>
                      <div className="table__actions">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<IconEdit size={16} />}
                          onClick={() => editPrice(item)}
                        >
                          السعر
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<IconPower size={16} />}
                          onClick={() => toggle(item)}
                        >
                          {item.is_available ? "إيقاف" : "تفعيل"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          style={{ color: "var(--danger)" }}
                          icon={<IconTrash size={16} />}
                          onClick={() => remove(item)}
                        >
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
