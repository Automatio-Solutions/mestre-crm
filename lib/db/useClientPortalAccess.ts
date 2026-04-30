"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ClientPortalAccess,
  fetchAccessByClient,
  ensureAccess as ensureAccessDB,
  updateAccess as updateAccessDB,
  regenerateToken as regenerateTokenDB,
  deleteAccess as deleteAccessDB,
} from "./clientPortalAccess";

/**
 * Hook que gestiona el acceso al portal de UN cliente concreto.
 * Crea el registro on-demand con credenciales por defecto la primera vez.
 */
export function useClientPortalAccess(clientId: string | null | undefined) {
  const [access, setAccess] = useState<ClientPortalAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const a = await fetchAccessByClient(clientId);
      setAccess(a);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const ensure = useCallback(async (defaults?: { username?: string; password?: string }) => {
    if (!clientId) return null;
    const a = await ensureAccessDB({
      clientId,
      username: defaults?.username ?? "123",
      password: defaults?.password ?? "123",
    });
    setAccess(a);
    return a;
  }, [clientId]);

  const update = useCallback(async (patch: { username?: string; password?: string }) => {
    if (!clientId) return null;
    const a = await updateAccessDB(clientId, patch);
    setAccess(a);
    return a;
  }, [clientId]);

  const regenerate = useCallback(async () => {
    if (!clientId) return null;
    const a = await regenerateTokenDB(clientId);
    setAccess(a);
    return a;
  }, [clientId]);

  const remove = useCallback(async () => {
    if (!clientId) return;
    await deleteAccessDB(clientId);
    setAccess(null);
  }, [clientId]);

  return { access, loading, error, ensure, update, regenerate, remove, reload };
}
