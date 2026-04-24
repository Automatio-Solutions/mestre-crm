"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Service, NewService,
  fetchServices, createService as apiCreate,
  updateService as apiUpdate, deleteService as apiDelete,
} from "./services";

export interface UseServicesState {
  services: Service[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewService) => Promise<Service>;
  update: (id: string, patch: Partial<Service>) => Promise<Service>;
  remove: (id: string) => Promise<void>;
}

export function useServices(): UseServicesState {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setServices(await fetchServices());
      setError(null);
    } catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: NewService) => {
    const created = await apiCreate(input);
    setServices((prev) => [...prev, created].sort(
      (a, b) => (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name, "es")
    ));
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Service>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? ({ ...s, ...patch } as Service) : s)));
    try {
      const updated = await apiUpdate(id, patch);
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    } catch (e) {
      try { setServices(await fetchServices()); } catch {}
      throw e;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { services, loading, error, refresh, create, update, remove };
}
