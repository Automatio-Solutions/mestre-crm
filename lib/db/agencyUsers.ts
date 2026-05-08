/**
 * CRUD de usuarios de la agencia (acceso a la app).
 *
 * Usado server-side desde los endpoints de /api/auth.
 * NO importes esto en componentes cliente — la cookie HttpOnly
 * se lee en el servidor.
 */
import { supabase } from "@/lib/supabase/client";

export interface AgencyUser {
  id: string;
  email: string;
  name: string;
  password: string;
  userRef: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

const fromRow = (r: any): AgencyUser => ({
  id: r.id,
  email: r.email,
  name: r.name,
  password: r.password,
  userRef: r.user_ref,
  isActive: !!r.is_active,
  createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
  lastLoginAt: r.last_login_at ? new Date(r.last_login_at) : null,
});

export async function fetchByEmail(email: string): Promise<AgencyUser | null> {
  const { data, error } = await supabase
    .from("agency_users")
    .select("*")
    .ilike("email", email.trim())
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function fetchById(id: string): Promise<AgencyUser | null> {
  const { data, error } = await supabase
    .from("agency_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function touchLastLogin(id: string): Promise<void> {
  await supabase
    .from("agency_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", id);
}

/** Resumen seguro del usuario para enviar al cliente (sin password). */
export type AgencyUserPublic = Omit<AgencyUser, "password">;
export const toPublic = (u: AgencyUser): AgencyUserPublic => {
  const { password: _p, ...rest } = u;
  return rest;
};
