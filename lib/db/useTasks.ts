"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Task, NewTask,
  fetchTasks, createTask as apiCreate,
  updateTask as apiUpdate, deleteTask as apiDelete,
} from "./tasks";

export interface UseTasksState {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewTask) => Promise<Task>;
  update: (id: string, patch: Partial<Task>) => Promise<Task>;
  remove: (id: string) => Promise<void>;
}

export function useTasks(filter?: { clientId?: string; moduleId?: string }): UseTasksState {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await fetchTasks());
      setError(null);
    } catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    let r = tasks;
    if (filter?.clientId) r = r.filter((t) => t.clientId === filter.clientId);
    if (filter?.moduleId) r = r.filter((t) => t.moduleId === filter.moduleId);
    return r;
  }, [tasks, filter?.clientId, filter?.moduleId]);

  const create = useCallback(async (input: NewTask) => {
    const created = await apiCreate(input);
    setTasks((prev) => [...prev, created]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Task>) => {
    // Optimistic update for fluid UX on drag-drop, checkboxes, etc.
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } as Task : t)));
    try {
      const updated = await apiUpdate(id, patch);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (e) {
      // rollback
      await refresh();
      throw e;
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { tasks: filtered, loading, error, refresh, create, update, remove };
}
