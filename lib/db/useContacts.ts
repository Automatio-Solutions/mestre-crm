"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Contact,
  NewContact,
  fetchContacts,
  createContact as apiCreate,
  updateContact as apiUpdate,
  deleteContact as apiDelete,
} from "./contacts";

export { type Contact, type NewContact } from "./contacts";

export interface UseContactsState {
  contacts: Contact[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: NewContact) => Promise<Contact>;
  update: (id: string, patch: Partial<Contact>) => Promise<Contact>;
  remove: (id: string) => Promise<void>;
}

export function useContacts(): UseContactsState {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchContacts();
      setContacts(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (input: NewContact) => {
    const created = await apiCreate(input);
    setContacts((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "es"))
    );
    return created;
  }, []);

  const update = useCallback(async (id: string, patch: Partial<Contact>) => {
    const updated = await apiUpdate(id, patch);
    setContacts((prev) =>
      prev
        .map((c) => (c.id === id ? updated : c))
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
    );
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await apiDelete(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { contacts, loading, error, refresh, create, update, remove };
}
