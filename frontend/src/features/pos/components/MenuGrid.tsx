import { useDeferredValue, useMemo, useState } from "react";
import type { Category, MenuItem } from "../../../types";
import { hueOf } from "../../../lib/hue";
import { EmptyState, SearchInput, Skeleton } from "../../../components/ui";
import { IconGrid, IconSearch } from "../../../components/icons";
import { CategoryRail, type CategoryValue } from "./CategoryRail";
import { MenuCard } from "./MenuCard";

/** هيكل الشاشة أثناء التحميل — نفس المقاسات، فمفيش «قفزة» لما المنيو يوصل. */
function MenuSkeleton() {
  return (
    <div className="pos" aria-busy="true">
      <div className="pos__rail">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} h={56} r={5} />
        ))}
      </div>
      <div className="pos__menu">
        <div className="pos__menu-scroll">
          <div className="grid-menu">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} h={118} r={5} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * شاشة المنيو: عمود الأقسام على الطرف + شبكة المفاتيح + بحث فوري.
 * كل جزء بيسكرول لوحده والصفحة ثابتة (AppShell بـ `fill`).
 */
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
  const [categoryId, setCategoryId] = useState<CategoryValue>("all");
  const [query, setQuery] = useState("");
  // الفلترة بتتأجّل عن الكتابة — الحقل بيفضل فوري مهما كبر المنيو
  const deferredQuery = useDeferredValue(query);

  const counts = useMemo(() => {
    const map = new Map<number, number>();
    for (const i of items) map.set(i.category_id, (map.get(i.category_id) ?? 0) + 1);
    return map;
  }, [items]);

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items.filter((i) => {
      if (categoryId !== "all" && i.category_id !== categoryId) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, categoryId, deferredQuery]);

  if (loading) return <MenuSkeleton />;

  const activeName =
    categoryId === "all"
      ? "كل الأصناف"
      : (categories.find((c) => c.id === categoryId)?.name ?? "كل الأصناف");

  return (
    <div className="pos">
      <CategoryRail
        categories={categories}
        counts={counts}
        total={items.length}
        value={categoryId}
        onChange={setCategoryId}
      />

      <section className="pos__menu" aria-label="أصناف المنيو">
        <div className="pos__menu-head">
          <div className="pos__menu-titles">
            <h2 className="pos__menu-title">{activeName}</h2>
            <span className="pos__menu-count num">{visible.length} صنف</span>
          </div>
          <SearchInput
            placeholder="دوّر على صنف…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="بحث في المنيو"
          />
        </div>

        <div className="pos__menu-scroll">
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
                  hue={hueOf(item.category_id)}
                  qty={quantities.get(item.id) ?? 0}
                  onAdd={onAdd}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
