"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Purchase, NewPurchase,
  fetchPurchases,
  createPurchase as apiCreate,
  updatePurchase as apiUpdate,
  deletePurchase as apiDelete,
  duplicatePurchase as apiDuplicate,
} from "./purchases";

export interface UsePurchasesState {
  purchases: Purchase[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewPurchase) => Promise<Purchase>;
  update: (id: string, patch: Partial<Purchase>) => Promise<Purchase>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Purchase>;
}

export function usePurchases(): UsePurchasesState {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setPurchases(await fetchPurchases());
      setError(null);
    } catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: NewPurchase) => {
    const created = await apiCreate(input);
    setPurchases((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Purchase>) => {
    setPurchases((prev) => prev.map((p) => (p.id === id ? ({ ...p, ...patch } as Purchase) : p)));
    try {
      const updated = await apiUpdate(id, patch);
      setPurchases((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch (e) {
      try { setPurchases(await fetchPurchases()); } catch {}
      throw e;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setPurchases((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const duplicate = useCallback(async (id: string) => {
    const created = await apiDuplicate(id);
    setPurchases((prev) => [created, ...prev]);
    return created;
  }, []);

  return { purchases, loading, error, refresh, create, update, remove, duplicate };
}
