import { supabase } from "@/lib/supabase/client";

export type BatchStatus = "generada" | "enviada" | "cobrada" | "devuelta";

export interface PaymentBatch {
  id: string;
  ref: string;
  date: Date;
  invoiceIds: string[];
  count: number;
  total: number;
  status: BatchStatus;
  notes: string | null;
}

export interface NewPaymentBatch {
  ref?: string;
  date?: Date;
  invoiceIds: string[];
  total: number;
  status?: BatchStatus;
  notes?: string | null;
}

const toISODate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

const fromRow = (r: any): PaymentBatch => ({
  id: r.id,
  ref: r.ref,
  date: new Date(r.date),
  invoiceIds: r.invoice_ids || [],
  count: Number(r.count || 0),
  total: Number(r.total),
  status: r.status,
  notes: r.notes,
});

const nextBatchRef = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 99).toString().padStart(2, "0");
  return `COB-${year}-${month}-${rand}`;
};

export async function fetchPaymentBatches(): Promise<PaymentBatch[]> {
  const { data, error } = await supabase
    .from("payment_batches")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createPaymentBatch(input: NewPaymentBatch): Promise<PaymentBatch> {
  const id = `pb-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const row = {
    id,
    ref: input.ref || nextBatchRef(),
    date: toISODate(input.date || new Date()),
    invoice_ids: input.invoiceIds,
    count: input.invoiceIds.length,
    total: input.total,
    status: input.status || "generada",
    notes: input.notes ?? null,
  };
  const { data, error } = await supabase.from("payment_batches").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updatePaymentBatch(id: string, patch: Partial<PaymentBatch>): Promise<PaymentBatch> {
  const out: Record<string, unknown> = {};
  if (patch.ref !== undefined) out.ref = patch.ref;
  if (patch.date !== undefined) out.date = toISODate(patch.date);
  if (patch.invoiceIds !== undefined) {
    out.invoice_ids = patch.invoiceIds;
    out.count = patch.invoiceIds.length;
  }
  if (patch.total !== undefined) out.total = patch.total;
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.notes !== undefined) out.notes = patch.notes;

  const { data, error } = await supabase
    .from("payment_batches")
    .update(out)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deletePaymentBatch(id: string): Promise<void> {
  const { error } = await supabase.from("payment_batches").delete().eq("id", id);
  if (error) throw error;
}
