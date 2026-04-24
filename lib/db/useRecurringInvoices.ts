"use client";
import { useCallback, useEffect, useState } from "react";
import {
  RecurringInvoice, NewRecurringInvoice,
  fetchRecurring, createRecurring as apiCreate,
  updateRecurring as apiUpdate, deleteRecurring as apiDelete,
} from "./recurringInvoices";

export interface UseRecurringInvoicesState {
  recurring: RecurringInvoice[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewRecurringInvoice) => Promise<RecurringInvoice>;
  update: (id: string, patch: Partial<RecurringInvoice>) => Promise<RecurringInvoice>;
  remove: (id: string) => Promise<void>;
}

export function useRecurringInvoices(): UseRecurringInvoicesState {
  const [recurring, setRecurring] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRecurring(await fetchRecurring());
      setError(null);
    } catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: NewRecurringInvoice) => {
    const created = await apiCreate(input);
    setRecurring((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<RecurringInvoice>) => {
    setRecurring((prev) => prev.map((r) => (r.id === id ? ({ ...r, ...patch } as RecurringInvoice) : r)));
    try {
      const updated = await apiUpdate(id, patch);
      setRecurring((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (e) {
      try { setRecurring(await fetchRecurring()); } catch {}
      throw e;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { recurring, loading, error, refresh, create, update, remove };
}
