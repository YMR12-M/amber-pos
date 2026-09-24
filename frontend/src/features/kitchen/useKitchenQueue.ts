import { useCallback, useState } from "react";
import { api } from "../../api";
import type { KitchenOrder } from "../../types";

/** طابور المطبخ + إجراءات تحديث الحالة. */
export function useKitchenQueue() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setOrders(await api.getKitchenQueue());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  }, []);

  return { orders, error, loading, refresh, setError };
}
