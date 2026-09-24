import { useState, type FormEvent } from "react";
import { api } from "../../../api";
import type { Category, MenuItem } from "../../../types";
import { Button, Card, CardHead, IconButton, Input, useDialog, useToast } from "../../../components/ui";
import { IconEdit, IconPlus, IconTag, IconTrash } from "../../../components/icons";

/**
 * أقسام المنيو.
 *
 * من غير قسم واحد على الأقل مينفعش تضيف صنف، فده أول حاجة الأدمن
 * بيعملها في محل جديد. القسم اللي فيه أصناف مش بيتحذف — السيرفر
 * بيرفض والرسالة بتوضّح السبب.
 */
export function CategoryManager({
  categories,
  items,
  onChanged,
}: {
  categories: Category[];
  items: MenuItem[];
  onChanged: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const dialog = useDialog();

  const countFor = (id: number) => items.filter((i) => i.category_id === id).length;

  async function add(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      // القسم الجديد بيروح آخر الترتيب، فالمنيو ما بيعدّش شكله فجأة.
      await api.createCategory({ name: trimmed, sort_order: categories.length + 1 });
      setName("");
      toast.success(`اتضاف قسم "${trimmed}"`);
      await onChanged();
    } catch (err) {
      toast.fromError(err, "فشل إضافة القسم");
    } finally {
      setSaving(false);
    }
  }

  async function rename(category: Category) {
    const next = await dialog.prompt({
      title: "اسم القسم",
      confirmLabel: "احفظ",
      defaultValue: category.name,
      placeholder: "اسم القسم",
    });
    if (next === null) return;

    const trimmed = next.trim();
    if (!trimmed || trimmed === category.name) return;

    try {
      await api.updateCategory(category.id, { name: trimmed });
      toast.success("تم تغيير الاسم");
      await onChanged();
    } catch (err) {
      toast.fromError(err, "فشل تغيير الاسم");
    }
  }

  async function remove(category: Category) {
    const count = countFor(category.id);
    if (count > 0) {
      toast.error(`"${category.name}" فيه ${count} صنف — احذفهم أو انقلهم الأول`);
      return;
    }

    const ok = await dialog.confirm({
      title: `حذف قسم "${category.name}"؟`,
      message: "القسم فاضي، فالحذف مش هيأثر على أي صنف أو فاتورة.",
      confirmLabel: "احذف",
      danger: true,
    });
    if (!ok) return;

    try {
      await api.deleteCategory(category.id);
      toast.info(`تم حذف "${category.name}"`);
      await onChanged();
    } catch (err) {
      toast.fromError(err, "فشل الحذف");
    }
  }

  return (
    <Card pad>
      <CardHead
        title={
          <span className="u-row">
            <IconTag size={17} /> الأقسام <span className="u-muted num">({categories.length})</span>
          </span>
        }
      />

      <form onSubmit={add} className="u-row" style={{ alignItems: "flex-end", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input
            label="قسم جديد"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
          />
        </div>
        <Button type="submit" variant="soft" loading={saving} icon={<IconPlus size={17} />}>
          إضافة
        </Button>
      </form>

      {categories.length === 0 ? (
        <p className="u-muted" style={{ fontSize: "var(--fs-sm)", marginTop: 12 }}>
          ابدأ بقسم — مثلاً «مشروبات» أو «أطباق رئيسية». الأصناف بتتحط جوّه الأقسام.
        </p>
      ) : (
        <div className="catlist" style={{ marginTop: 14 }}>
          {categories.map((c) => (
            <div key={c.id} className="catrow">
              <span className="catrow__name">{c.name}</span>
              <span className="catrow__count num">{countFor(c.id)} صنف</span>
              <span className="catrow__spacer" />
              <IconButton
                label={`تعديل ${c.name}`}
                variant="plain"
                icon={<IconEdit size={17} />}
                onClick={() => rename(c)}
              />
              <IconButton
                label={`حذف ${c.name}`}
                variant="plain"
                icon={<IconTrash size={17} />}
                onClick={() => remove(c)}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
