"use client";
import { useCallback, useEffect, useState } from "react";
import {
  PaymentBatch, NewPaymentBatch,
  fetchPaymentBatches, createPaymentBatch as apiCreate,
  updatePaymentBatch as apiUpdate, deletePaymentBatch as apiDelete,
} from "./paymentBatches";

export interface UsePaymentBatchesState {
  batches: PaymentBatch[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewPaymentBatch) => Promise<PaymentBatch>;
  update: (id: string, patch: Partial<PaymentBatch>) => Promise<PaymentBatch>;
  remove: (id: string) => Promise<void>;
}

export function usePaymentBatches(): UsePaymentBatchesState {
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setBatches(await fetchPaymentBatches());
      setError(null);
    } catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: NewPaymentBatch) => {
    const created = await apiCreate(input);
    setBatches((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<PaymentBatch>) => {
    setBatches((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as PaymentBatch) : b)));
    try {
      const updated = await apiUpdate(id, patch);
      setBatches((prev) => prev.map((b) => (b.id === id ? updated : b)));
      return updated;
    } catch (e) {
      try { setBatches(await fetchPaymentBatches()); } catch {}
      throw e;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setBatches((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return { batches, loading, error, refresh, create, update, remove };
}
