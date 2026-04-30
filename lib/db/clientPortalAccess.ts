import { supabase } from "@/lib/supabase/client";

export interface ClientPortalAccess {
  id: string;
  clientId: string;
  token: string;          // UUID del enlace público
  username: string;
  password: string;       // ⚠️ plain-text (uso interno)
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface NewClientPortalAccess {
  clientId: string;
  username: string;
  password: string;
}

const fromRow = (r: any): ClientPortalAccess => ({
  id: r.id,
  clientId: r.client_id,
  token: r.token,
  username: r.username,
  password: r.password,
  createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
  lastLoginAt: r.last_login_at ? new Date(r.last_login_at) : null,
});

const toRow = (a: Partial<ClientPortalAccess>) => {
  const r: Record<string, unknown> = {};
  if (a.id !== undefined) r.id = a.id;
  if (a.clientId !== undefined) r.client_id = a.clientId;
  if (a.token !== undefined) r.token = a.token;
  if (a.username !== undefined) r.username = a.username;
  if (a.password !== undefined) r.password = a.password;
  if (a.lastLoginAt !== undefined) r.last_login_at = a.lastLoginAt ? a.lastLoginAt.toISOString() : null;
  return r;
};

// ---- helpers ----
const newToken = () => {
  // UUID v4 simple (sin dependencias)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const newId = () => `pa-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

// ---- fetch ----
export async function fetchAccessByClient(clientId: string): Promise<ClientPortalAccess | null> {
  const { data, error } = await supabase
    .from("client_portal_access")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function fetchAccessByToken(token: string): Promise<ClientPortalAccess | null> {
  const { data, error } = await supabase
    .from("client_portal_access")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

// ---- crear / asegurar acceso (idempotente por cliente) ----
export async function ensureAccess(input: NewClientPortalAccess): Promise<ClientPortalAccess> {
  const existing = await fetchAccessByClient(input.clientId);
  if (existing) return existing;
  const row = {
    id: newId(),
    client_id: input.clientId,
    token: newToken(),
    username: input.username,
    password: input.password,
  };
  const { data, error } = await supabase
    .from("client_portal_access")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

// ---- actualizar credenciales ----
export async function updateAccess(
  clientId: string,
  patch: { username?: string; password?: string }
): Promise<ClientPortalAccess> {
  const row: Record<string, unknown> = {};
  if (patch.username !== undefined) row.username = patch.username;
  if (patch.password !== undefined) row.password = patch.password;
  const { data, error } = await supabase
    .from("client_portal_access")
    .update(row)
    .eq("client_id", clientId)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

// ---- regenerar token (rota el enlace) ----
export async function regenerateToken(clientId: string): Promise<ClientPortalAccess> {
  const { data, error } = await supabase
    .from("client_portal_access")
    .update({ token: newToken() })
    .eq("client_id", clientId)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

// ---- registrar último login ----
export async function touchLastLogin(token: string): Promise<void> {
  await supabase
    .from("client_portal_access")
    .update({ last_login_at: new Date().toISOString() })
    .eq("token", token);
}

// ---- borrar acceso (revocar) ----
export async function deleteAccess(clientId: string): Promise<void> {
  const { error } = await supabase
    .from("client_portal_access")
    .delete()
    .eq("client_id", clientId);
  if (error) throw error;
}
