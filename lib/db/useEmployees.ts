"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Employee, NewEmployee,
  fetchEmployees, createEmployee as apiCreate,
  updateEmployee as apiUpdate, deleteEmployee as apiDelete,
} from "./employees";

export interface UseEmployeesState {
  employees: Employee[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewEmployee) => Promise<Employee>;
  update: (id: string, patch: Partial<Employee>) => Promise<Employee>;
  remove: (id: string) => Promise<void>;
}

export function useEmployees(): UseEmployeesState {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEmployees(await fetchEmployees());
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: NewEmployee) => {
    const created = await apiCreate(input);
    setEmployees((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Employee>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? ({ ...e, ...patch } as Employee) : e)));
    try {
      const updated = await apiUpdate(id, patch);
      setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return updated;
    } catch (err) {
      await refresh();
      throw err;
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { employees, loading, error, refresh, create, update, remove };
}
