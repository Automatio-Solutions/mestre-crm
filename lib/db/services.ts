import { supabase } from "@/lib/supabase/client";

export interface Service {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  vat: number;
  active: boolean;
  sortOrder: number | null;
}

export interface NewService {
  name: string;
  category?: string | null;
  description?: string | null;
  price: number;
  vat?: number;
  active?: boolean;
}

const fromRow = (r: any): Service => ({
  id: r.id,
  name: r.name,
  category: r.category,
  description: r.description,
  price: Number(r.price),
  vat: Number(r.vat ?? 21),
  active: r.active !== false,
  sortOrder: r.sort_order,
});

const toRow = (s: Partial<Service>) => {
  const r: Record<string, unknown> = {};
  if (s.id !== undefined) r.id = s.id;
  if (s.name !== undefined) r.name = s.name;
  if (s.category !== undefined) r.category = s.category;
  if (s.description !== undefined) r.description = s.description;
  if (s.price !== undefined) r.price = s.price;
  if (s.vat !== undefined) r.vat = s.vat;
  if (s.active !== undefined) r.active = s.active;
  if (s.sortOrder !== undefined) r.sort_order = s.sortOrder;
  return r;
};

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createService(input: NewService): Promise<Service> {
  const id = `s-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const row = toRow({
    id,
    name: input.name,
    category: input.category ?? null,
    description: input.description ?? null,
    price: input.price,
    vat: input.vat ?? 21,
    active: input.active ?? true,
  });
  const { data, error } = await supabase.from("services").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateService(id: string, patch: Partial<Service>): Promise<Service> {
  const { data, error } = await supabase
    .from("services")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}
