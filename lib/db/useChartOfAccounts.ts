"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ChartAccount, NewChartAccount,
  fetchChartAccounts, createChartAccount as apiCreate,
  updateChartAccount as apiUpdate, deleteChartAccount as apiDelete,
} from "./chartOfAccounts";

export interface UseChartOfAccountsState {
  accounts: ChartAccount[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewChartAccount) => Promise<ChartAccount>;
  update: (id: string, patch: Partial<ChartAccount>) => Promise<ChartAccount>;
  remove: (id: string) => Promise<void>;
}

export function useChartOfAccounts(): UseChartOfAccountsState {
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await fetchChartAccounts());
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: NewChartAccount) => {
    const created = await apiCreate(input);
    setAccounts((prev) => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)));
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<ChartAccount>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...patch } as ChartAccount) : a)));
    try {
      const updated = await apiUpdate(id, patch);
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      return updated;
    } catch (err) {
      await refresh();
      throw err;
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { accounts, loading, error, refresh, create, update, remove };
}
