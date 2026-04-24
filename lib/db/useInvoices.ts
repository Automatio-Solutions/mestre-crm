"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Invoice, NewInvoice,
  fetchInvoices, createInvoice as apiCreate,
  updateInvoice as apiUpdate, deleteInvoice as apiDelete,
  duplicateInvoice as apiDuplicate,
} from "./invoices";

export interface UseInvoicesState {
  invoices: Invoice[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewInvoice) => Promise<Invoice>;
  update: (id: string, patch: Partial<Invoice>) => Promise<Invoice>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Invoice>;
}

export function useInvoices(): UseInvoicesState {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setInvoices(await fetchInvoices());
      setError(null);
    } catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: NewInvoice) => {
    const created = await apiCreate(input);
    setInvoices((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Invoice>) => {
    // Optimistic: actualizamos la UI al instante y si la llamada a DB falla, rollback.
    setInvoices((prev) => prev.map((i) => (i.id === id ? ({ ...i, ...patch } as Invoice) : i)));
    try {
      const updated = await apiUpdate(id, patch);
      setInvoices((prev) => prev.map((i) => (i.id === id ? updated : i)));
      return updated;
    } catch (e) {
      // Rollback: recargamos desde DB
      try { setInvoices(await fetchInvoices()); } catch {}
      throw e;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const duplicate = useCallback(async (id: string) => {
    const created = await apiDuplicate(id);
    setInvoices((prev) => [created, ...prev]);
    return created;
  }, []);

  return { invoices, loading, error, refresh, create, update, remove, duplicate };
}
