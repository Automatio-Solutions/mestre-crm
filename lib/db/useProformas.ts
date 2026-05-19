"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Proforma, NewProforma,
  fetchProformas, createProforma as apiCreate,
  updateProforma as apiUpdate, deleteProforma as apiDelete,
  duplicateProforma as apiDuplicate,
} from "./proformas";

export interface UseProformasState {
  proformas: Proforma[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewProforma) => Promise<Proforma>;
  update: (id: string, patch: Partial<Proforma>) => Promise<Proforma>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Proforma>;
}

export function useProformas(): UseProformasState {
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProformas(await fetchProformas());
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: NewProforma) => {
    const created = await apiCreate(input);
    setProformas((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Proforma>) => {
    setProformas((prev) => prev.map((p) => (p.id === id ? ({ ...p, ...patch } as Proforma) : p)));
    try {
      const updated = await apiUpdate(id, patch);
      setProformas((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch (e) {
      await refresh();
      throw e;
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setProformas((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const duplicate = useCallback(async (id: string) => {
    const created = await apiDuplicate(id);
    setProformas((prev) => [created, ...prev]);
    return created;
  }, []);

  return { proformas, loading, error, refresh, create, update, remove, duplicate };
}
