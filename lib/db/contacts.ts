import { supabase } from "@/lib/supabase/client";

export type ContactType = "cliente" | "proveedor" | "lead";

export interface Contact {
  id: string;
  type: ContactType;
  name: string;
  nif: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  province: string | null;
  country: string | null;
  tags: string[];
  facturado: number;
  lastInteraction: Date | null;
  status: string | null;
}

export interface NewContact {
  type: ContactType;
  name: string;
  nif?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  city?: string | null;
  address?: string | null;
  postalCode?: string | null;
  province?: string | null;
  country?: string | null;
  tags?: string[];
  facturado?: number;
  status?: string | null;
}

// -------- row <-> model --------
const fromRow = (row: any): Contact => ({
  id: row.id,
  type: row.type,
  name: row.name,
  nif: row.nif,
  email: row.email,
  phone: row.phone,
  website: row.website,
  city: row.city,
  address: row.address,
  postalCode: row.postal_code,
  province: row.province,
  country: row.country,
  tags: row.tags || [],
  facturado: Number(row.facturado || 0),
  lastInteraction: row.last_interaction ? new Date(row.last_interaction) : null,
  status: row.status,
});

const toRow = (c: Partial<Contact>) => {
  const r: Record<string, unknown> = {};
  if (c.id !== undefined) r.id = c.id;
  if (c.type !== undefined) r.type = c.type;
  if (c.name !== undefined) r.name = c.name;
  if (c.nif !== undefined) r.nif = c.nif;
  if (c.email !== undefined) r.email = c.email;
  if (c.phone !== undefined) r.phone = c.phone;
  if (c.website !== undefined) r.website = c.website;
  if (c.city !== undefined) r.city = c.city;
  if (c.address !== undefined) r.address = c.address;
  if (c.postalCode !== undefined) r.postal_code = c.postalCode;
  if (c.province !== undefined) r.province = c.province;
  if (c.country !== undefined) r.country = c.country;
  if (c.tags !== undefined) r.tags = c.tags;
  if (c.facturado !== undefined) r.facturado = c.facturado;
  if (c.lastInteraction !== undefined) {
    r.last_interaction = c.lastInteraction
      ? c.lastInteraction.toISOString().slice(0, 10)
      : null;
  }
  if (c.status !== undefined) r.status = c.status;
  return r;
};

// -------- CRUD --------
export async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function fetchContact(id: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function createContact(input: NewContact): Promise<Contact> {
  const id = `c-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const row = toRow({
    id,
    type: input.type,
    name: input.name,
    nif: input.nif ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    website: input.website ?? null,
    city: input.city ?? null,
    address: input.address ?? null,
    postalCode: input.postalCode ?? null,
    province: input.province ?? null,
    country: input.country ?? "ES",
    tags: input.tags ?? [],
    facturado: input.facturado ?? 0,
    status: input.status ?? (input.type === "lead" ? "lead" : "activo"),
    lastInteraction: new Date(),
  });
  const { data, error } = await supabase.from("contacts").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateContact(id: string, patch: Partial<Contact>): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;
}

// -------- helpers para links externos --------
export const normalizePhoneForWhatsApp = (phone: string | null) => {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return digits || null;
};

export const normalizeWebsite = (url: string | null) => {
  if (!url) return null;
  const t = url.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
};

export const googleMapsUrl = (c: Pick<Contact, "address" | "city" | "postalCode" | "province" | "country">) => {
  const parts = [c.address, c.postalCode, c.city, c.province, c.country].filter(Boolean);
  if (parts.length === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
};
