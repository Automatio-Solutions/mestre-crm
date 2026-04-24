"use client";
import { useCallback, useEffect, useState } from "react";
import {
  TaxModel, NewTaxModel,
  fetchTaxModels, createTaxModel as apiCreate,
  updateTaxModel as apiUpdate, deleteTaxModel as apiDelete,
} from "./taxModels";

export interface UseTaxModelsState {
  taxModels: TaxModel[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewTaxModel) => Promise<TaxModel>;
  update: (id: string, patch: Partial<TaxModel>) => Promise<TaxModel>;
  remove: (id: string) => Promise<void>;
}

export function useTaxModels(): UseTaxModelsState {
  const [taxModels, setTaxModels] = useState<TaxModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTaxModels(await fetchTaxModels());
      setError(null);
    } catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: NewTaxModel) => {
    const created = await apiCreate(input);
    setTaxModels((prev) => [...prev, created].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()));
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<TaxModel>) => {
    setTaxModels((prev) => prev.map((t) => (t.id === id ? ({ ...t, ...patch } as TaxModel) : t)));
    try {
      const updated = await apiUpdate(id, patch);
      setTaxModels((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (e) {
      try { setTaxModels(await fetchTaxModels()); } catch {}
      throw e;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setTaxModels((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { taxModels, loading, error, refresh, create, update, remove };
}
