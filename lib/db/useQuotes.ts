"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Quote, NewQuote, QuoteStatus,
  fetchQuotes, createQuote as apiCreate,
  updateQuote as apiUpdate, deleteQuote as apiDelete,
  duplicateQuote as apiDuplicate,
} from "./quotes";

export interface UseQuotesState {
  quotes: Quote[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewQuote) => Promise<Quote>;
  update: (id: string, patch: Partial<Quote>) => Promise<Quote>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Quote>;
  moveToStatus: (id: string, status: QuoteStatus) => Promise<void>;
}

export function useQuotes(): UseQuotesState {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setQuotes(await fetchQuotes());
      setError(null);
    } catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: NewQuote) => {
    const created = await apiCreate(input);
    setQuotes((prev) => [created, ...prev]);
    return created;
  }, []);

  // Optimistic update — la UI cambia antes del round-trip a Supabase
  const update = useCallback(async (id: string, patch: Partial<Quote>) => {
    setQuotes((prev) => prev.map((q) => (q.id === id ? ({ ...q, ...patch } as Quote) : q)));
    try {
      const updated = await apiUpdate(id, patch);
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)));
      return updated;
    } catch (e) {
      await refresh();
      throw e;
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const duplicate = useCallback(async (id: string) => {
    const created = await apiDuplicate(id);
    setQuotes((prev) => [created, ...prev]);
    return created;
  }, []);

  // Helper: mover a columna aplicando side-effects del estado
  const moveToStatus = useCallback(async (id: string, status: QuoteStatus) => {
    const patch: Partial<Quote> = { status };
    if (status === "aceptado") {
      patch.acceptedDate = new Date();
      patch.probability = 100;
      patch.rejectedDate = null;
    } else if (status === "rechazado") {
      patch.rejectedDate = new Date();
      patch.probability = 0;
      patch.acceptedDate = null;
    } else {
      // Si lo movemos fuera de aceptado/rechazado, limpiamos esas fechas
      patch.acceptedDate = null;
      patch.rejectedDate = null;
    }
    await update(id, patch);
  }, [update]);

  return { quotes, loading, error, refresh, create, update, remove, duplicate, moveToStatus };
}
