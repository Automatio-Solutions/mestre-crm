"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ClientSpace, NewClientSpace, Module, NewModule,
  fetchClientSpaces,
  createClientSpace as apiCreateSpace,
  updateClientSpace as apiUpdateSpace,
  deleteClientSpace as apiDeleteSpace,
  createModule as apiCreateModule,
  deleteModule as apiDeleteModule,
} from "./clientSpaces";

export interface UseClientSpacesState {
  spaces: ClientSpace[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createSpace: (input: NewClientSpace) => Promise<ClientSpace>;
  updateSpace: (id: string, patch: Partial<ClientSpace>) => Promise<ClientSpace>;
  removeSpace: (id: string) => Promise<void>;
  createModule: (input: NewModule) => Promise<Module>;
  removeModule: (clientId: string, moduleId: string) => Promise<void>;
}

export function useClientSpaces(): UseClientSpacesState {
  const [spaces, setSpaces] = useState<ClientSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSpaces(await fetchClientSpaces());
      setError(null);
    } catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createSpace = useCallback(async (input: NewClientSpace) => {
    const created = await apiCreateSpace(input);
    setSpaces((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "es")));
    return created;
  }, []);

  const updateSpace = useCallback(async (id: string, patch: Partial<ClientSpace>) => {
    const updated = await apiUpdateSpace(id, patch);
    setSpaces((prev) =>
      prev.map((s) => (s.id === id ? { ...updated, modules: s.modules } : s))
    );
    return updated;
  }, []);

  const removeSpace = useCallback(async (id: string) => {
    await apiDeleteSpace(id);
    setSpaces((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const createModule = useCallback(async (input: NewModule) => {
    const created = await apiCreateModule(input);
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === input.clientId ? { ...s, modules: [...s.modules, created] } : s
      )
    );
    return created;
  }, []);

  const removeModule = useCallback(async (clientId: string, moduleId: string) => {
    await apiDeleteModule(clientId, moduleId);
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === clientId ? { ...s, modules: s.modules.filter((m) => m.id !== moduleId) } : s
      )
    );
  }, []);

  return { spaces, loading, error, refresh, createSpace, updateSpace, removeSpace, createModule, removeModule };
}
