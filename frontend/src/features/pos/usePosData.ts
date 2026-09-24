import { useCallback, useEffect, useRef, useState } from "react";
import { api, UnauthorizedError } from "../../api";
import type { Category, MenuItem, Order, OrderStatus, RestaurantTable } from "../../types";

/** الحالات اللي بتخلي الطلب "مفتوح" — بتتبعت في نداء واحد. */
const OPEN_STATUSES: OrderStatus[] = ["pending", "preparing", "ready", "served"];

/** 401 بتتصرّف فيها طبقة الجلسة — مش خطأ نعرضه للكاشير. */
function message(err: unknown, fallback: string) {
  if (err instanceof UnauthorizedError) return "";
  return err instanceof Error ? err.message : fallback;
}

/**
 * كل نداءات الشبكة الخاصة بشاشة الكاشير في هوك واحد.
 *
 * أي فشل في التحميل بيتحوّل لحالة `error` ظاهرة مع `reload` —
 * الكاشير لازم يعرف إن المنيو مش محمّل، مش يبصّ على شاشة فاضية.
 */
export function usePosData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveError, setLiveError] = useState("");

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadTables = useCallback(async () => {
    try {
      const data = await api.getTables();
      if (alive.current) {
        setTables(data);
        setLiveError("");
      }
    } catch (err) {
      if (alive.current) setLiveError(message(err, "تعذّر تحديث الطاولات"));
    }
  }, []);

  const loadOpenOrders = useCallback(async () => {
    try {
      // نداء واحد لكل الحالات المفتوحة. كان أربعة، يعني تابلت الكاشير
      // كان بيعمل 37 نداء في الدقيقة لوحده ويقرّب من سقف السيرفر.
      const page = await api.getOrders({ status: OPEN_STATUSES, page_size: 100 });
      if (alive.current) {
        setOpenOrders([...page.data].sort((a, b) => a.id - b.id));
        setLiveError("");
      }
    } catch (err) {
      if (alive.current) setLiveError(message(err, "تعذّر تحديث الطلبات المفتوحة"));
    }
  }, []);

  /** تحميل المنيو — ده اللي من غيره الشاشة ما تشتغلش. */
  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cats, menu] = await Promise.all([api.getCategories(), api.getMenuItems()]);
      if (!alive.current) return;
      setCategories(cats);
      setItems(menu);
    } catch (err) {
      if (alive.current) setError(message(err, "تعذّر تحميل المنيو"));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
    loadTables();
    loadOpenOrders();
  }, [loadMenu, loadTables, loadOpenOrders]);

  const refreshLive = useCallback(async () => {
    await Promise.all([loadTables(), loadOpenOrders()]);
  }, [loadTables, loadOpenOrders]);

  /** إعادة محاولة كاملة — الزر اللي بيظهر مع رسالة الخطأ. */
  const reload = useCallback(async () => {
    await Promise.all([loadMenu(), refreshLive()]);
  }, [loadMenu, refreshLive]);

  return {
    categories,
    items,
    tables,
    openOrders,
    loading,
    /** فشل تحميل المنيو — يمنع الشغل، بيتعرض كبانر مع إعادة محاولة */
    error,
    /** فشل تحديث دوري — بيتعرض كتنبيه خفيف من غير ما يوقف الشاشة */
    liveError,
    loadTables,
    loadOpenOrders,
    refreshLive,
    reload,
  };
}
