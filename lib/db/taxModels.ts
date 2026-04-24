import { supabase } from "@/lib/supabase/client";

export type TaxStatus = "pendiente" | "presentado" | "aplazado";

export interface TaxModel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  period: string;
  dueDate: Date;
  amount: number;
  status: TaxStatus;
  presentedDate: Date | null;
  notes: string | null;
}

export interface NewTaxModel {
  code: string;
  name: string;
  description?: string | null;
  period: string;
  dueDate: Date;
  amount: number;
  status?: TaxStatus;
  presentedDate?: Date | null;
  notes?: string | null;
}

const toISODate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

const fromRow = (r: any): TaxModel => ({
  id: r.id,
  code: r.code,
  name: r.name,
  description: r.description,
  period: r.period,
  dueDate: new Date(r.due_date),
  amount: Number(r.amount),
  status: r.status,
  presentedDate: r.presented_date ? new Date(r.presented_date) : null,
  notes: r.notes,
});

const toRow = (t: Partial<TaxModel>) => {
  const r: Record<string, unknown> = {};
  if (t.id !== undefined) r.id = t.id;
  if (t.code !== undefined) r.code = t.code;
  if (t.name !== undefined) r.name = t.name;
  if (t.description !== undefined) r.description = t.description;
  if (t.period !== undefined) r.period = t.period;
  if (t.dueDate !== undefined) r.due_date = toISODate(t.dueDate);
  if (t.amount !== undefined) r.amount = t.amount;
  if (t.status !== undefined) r.status = t.status;
  if (t.presentedDate !== undefined) r.presented_date = toISODate(t.presentedDate);
  if (t.notes !== undefined) r.notes = t.notes;
  return r;
};

export async function fetchTaxModels(): Promise<TaxModel[]> {
  const { data, error } = await supabase
    .from("tax_models")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createTaxModel(input: NewTaxModel): Promise<TaxModel> {
  const id = `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const row = toRow({ id, ...input, status: input.status ?? "pendiente" });
  const { data, error } = await supabase.from("tax_models").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateTaxModel(id: string, patch: Partial<TaxModel>): Promise<TaxModel> {
  const { data, error } = await supabase
    .from("tax_models")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteTaxModel(id: string): Promise<void> {
  const { error } = await supabase.from("tax_models").delete().eq("id", id);
  if (error) throw error;
}
