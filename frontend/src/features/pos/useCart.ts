import { useCallback, useMemo, useState } from "react";
import type { MenuItem } from "../../types";

export interface CartLine {
  menu_item_id: number;
  name: string;
  price: number;
  quantity: number;
  /** ملاحظة للمطبخ: "من غير بصل" · "زيادة استواء". بتتطبع في كرت المطبخ. */
  notes?: string;
}

/**
 * منطق السلة كله في مكان واحد — الصفحة بتستخدمه من غير ما تعرف تفاصيله.
 * كل الحسابات هنا للعرض فقط؛ السيرفر هو اللي بيحسب الفاتورة الحقيقية.
 */
export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("");

  const add = useCallback((item: MenuItem) => {
    setLines((prev) => {
      const found = prev.find((l) => l.menu_item_id === item.id);
      if (found) {
        return prev.map((l) =>
          l.menu_item_id === item.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        { menu_item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 },
      ];
    });
  }, []);

  const changeQty = useCallback((id: number, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.menu_item_id === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }, []);

  const remove = useCallback((id: number) => {
    setLines((prev) => prev.filter((l) => l.menu_item_id !== id));
  }, []);

  const setNotes = useCallback((id: number, notes: string) => {
    setLines((prev) =>
      prev.map((l) => (l.menu_item_id === id ? { ...l, notes: notes || undefined } : l))
    );
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setDiscount("");
  }, []);

  /** كمية كل صنف — عشان الكرت يعرض العدّاد من غير بحث في كل رسمة. */
  const quantities = useMemo(() => {
    const map = new Map<number, number>();
    for (const l of lines) map.set(l.menu_item_id, l.quantity);
    return map;
  }, [lines]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [lines]
  );

  const discountValue = Math.max(0, Number(discount) || 0);
  const discountTooBig = discountValue > subtotal;
  const total = Math.max(0, subtotal - discountValue);
  const count = useMemo(() => lines.reduce((n, l) => n + l.quantity, 0), [lines]);

  return {
    lines,
    quantities,
    count,
    subtotal,
    discount,
    discountValue,
    discountTooBig,
    total,
    setDiscount,
    add,
    changeQty,
    remove,
    setNotes,
    clear,
  };
}
