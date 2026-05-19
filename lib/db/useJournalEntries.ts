"use client";
import { useCallback, useEffect, useState } from "react";
import {
  JournalEntry, NewJournalEntry, JournalLine,
  fetchJournalEntries, createJournalEntry as apiCreate,
  updateJournalEntry as apiUpdate, deleteJournalEntry as apiDelete,
} from "./journalEntries";

export interface UseJournalEntriesState {
  entries: JournalEntry[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewJournalEntry) => Promise<JournalEntry>;
  update: (id: string, patch: Partial<Omit<JournalEntry, "lines">> & { lines?: NewJournalEntry["lines"] }) => Promise<JournalEntry>;
  remove: (id: string) => Promise<void>;
}

export function useJournalEntries(): UseJournalEntriesState {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await fetchJournalEntries());
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: NewJournalEntry) => {
    const created = await apiCreate(input);
    setEntries((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(
    async (id: string, patch: Partial<Omit<JournalEntry, "lines">> & { lines?: NewJournalEntry["lines"] }) => {
      const updated = await apiUpdate(id, patch);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, loading, error, refresh, create, update, remove };
}
