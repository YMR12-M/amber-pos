import { useDeferredValue, useMemo, useState } from "react";
import type { Category, MenuItem } from "../../../types";
import { ChipRow, EmptyState, SearchInput, SkeletonGrid } from "../../../components/ui";
import { IconGrid, IconSearch } from "../../../components/icons";
import { MenuCard } from "./MenuCard";

/** شبكة المنيو + فلتر الأقسام + بحث فوري. */
export function MenuGrid({
  categories,
  items,
  quantities,
  loading,
  onAdd,
}: {
  categories: Category[];
  items: MenuItem[];
  quantities: Map<number, number>;
  loading: boolean;
  onAdd: (item: MenuItem) => void;
}) {
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  // الفلترة بتتأجّل عن الكتابة — الحقل بيفضل فوري مهما كبر المنيو
  const deferredQuery = useDeferredValue(query);

  const counts = useMemo(() => {
    const map = new Map<number, number>();
    for (const i of items) map.set(i.category_id, (map.get(i.category_id) ?? 0) + 1);
    return map;
  }, [items]);

  const options = useMemo(
    () => [
      { value: "all" as const, label: "الكل", count: items.length },
      ...categories.map((c) => ({
        value: c.id,
        label: c.name,
        count: counts.get(c.id) ?? 0,
      })),
    ],
    [categories, counts, items.length]
  );

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items.filter((i) => {
      if (categoryId !== "all" && i.category_id !== categoryId) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, categoryId, deferredQuery]);

  if (loading) return <SkeletonGrid count={10} />;

  return (
    <div className="section">
      <div className="section__head">
        <ChipRow
          label="أقسام المنيو"
          options={options}
          value={categoryId}
          onChange={(v) => setCategoryId(v as number | "all")}
        />
        <SearchInput
          placeholder="دوّر على صنف…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="بحث في المنيو"
        />
      </div>

      {items.length === 0 ? (
        /* منيو فاضي خالص ≠ بحث من غير نتيجة. الكاشير لازم يعرف إن
           المشكلة مش في كلمة البحث، وإن الحل عند الأدمن. */
        <EmptyState
          icon={<IconGrid size={30} />}
          title="المنيو لسه فاضي"
          text="الأصناف بتتضاف من لوحة التحكم ← المنيو."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<IconSearch size={30} />}
          title="مفيش أصناف مطابقة"
          text="جرّب تغيّر القسم أو تمسح كلمة البحث."
        />
      ) : (
        <div className="grid-menu" data-stale={query !== deferredQuery || undefined}>
          {visible.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              qty={quantities.get(item.id) ?? 0}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
