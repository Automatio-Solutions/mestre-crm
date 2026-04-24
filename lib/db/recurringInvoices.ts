import { supabase } from "@/lib/supabase/client";

export type Frequency = "Mensual" | "Trimestral" | "Anual";

export interface RecurringInvoice {
  id: string;
  clientId: string | null;
  concept: string | null;
  amount: number;
  vatPct: number;
  frequency: Frequency;
  nextDate: Date | null;
  active: boolean;
  issuedCount: number;
  paymentMethod: string;
  notes: string | null;
}

export interface NewRecurringInvoice {
  clientId?: string | null;
  concept?: string | null;
  amount: number;
  vatPct?: number;
  frequency?: Frequency;
  nextDate?: Date | null;
  active?: boolean;
  paymentMethod?: string;
  notes?: string | null;
}

const toISODate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

const fromRow = (r: any): RecurringInvoice => ({
  id: r.id,
  clientId: r.client_id,
  concept: r.concept,
  amount: Number(r.amount),
  vatPct: Number(r.vat_pct ?? 21),
  frequency: r.frequency,
  nextDate: r.next_date ? new Date(r.next_date) : null,
  active: r.active !== false,
  issuedCount: Number(r.issued_count || 0),
  paymentMethod: r.payment_method || "transferencia",
  notes: r.notes,
});

const toRow = (r: Partial<RecurringInvoice>) => {
  const out: Record<string, unknown> = {};
  if (r.id !== undefined) out.id = r.id;
  if (r.clientId !== undefined) out.client_id = r.clientId;
  if (r.concept !== undefined) out.concept = r.concept;
  if (r.amount !== undefined) out.amount = r.amount;
  if (r.vatPct !== undefined) out.vat_pct = r.vatPct;
  if (r.frequency !== undefined) out.frequency = r.frequency;
  if (r.nextDate !== undefined) out.next_date = toISODate(r.nextDate);
  if (r.active !== undefined) out.active = r.active;
  if (r.issuedCount !== undefined) out.issued_count = r.issuedCount;
  if (r.paymentMethod !== undefined) out.payment_method = r.paymentMethod;
  if (r.notes !== undefined) out.notes = r.notes;
  return out;
};

export async function fetchRecurring(): Promise<RecurringInvoice[]> {
  const { data, error } = await supabase
    .from("recurring_invoices")
    .select("*")
    .order("active", { ascending: false })
    .order("next_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createRecurring(input: NewRecurringInvoice): Promise<RecurringInvoice> {
  const id = `r-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const row = toRow({
    id,
    clientId: input.clientId ?? null,
    concept: input.concept ?? null,
    amount: input.amount,
    vatPct: input.vatPct ?? 21,
    frequency: input.frequency ?? "Mensual",
    nextDate: input.nextDate ?? null,
    active: input.active ?? true,
    issuedCount: 0,
    paymentMethod: input.paymentMethod ?? "transferencia",
    notes: input.notes ?? null,
  });
  const { data, error } = await supabase.from("recurring_invoices").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateRecurring(id: string, patch: Partial<RecurringInvoice>): Promise<RecurringInvoice> {
  const { data, error } = await supabase
    .from("recurring_invoices")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteRecurring(id: string): Promise<void> {
  const { error } = await supabase.from("recurring_invoices").delete().eq("id", id);
  if (error) throw error;
}
