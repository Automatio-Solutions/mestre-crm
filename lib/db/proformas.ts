import { supabase } from "@/lib/supabase/client";
import type { InvoiceLine } from "./invoices";

export type ProformaStatus = "pendiente" | "facturada" | "cobrada" | "vencida";

// Reutilizamos la estructura de línea de factura (mismo shape).
export type ProformaLine = InvoiceLine;

export interface Proforma {
  id: string;
  number: string;
  clientId: string | null;
  concept: string | null;
  amount: number;            // total con IVA
  vatPct: number;
  status: ProformaStatus;
  issueDate: Date;
  validUntil: Date | null;
  linkedQuoteId: string | null;
  linkedInvoiceId: string | null;
  internalNote: string | null;
  lines: ProformaLine[];
  terms: string | null;
  tags: string[];
}

export interface NewProforma {
  number?: string;
  clientId?: string | null;
  concept?: string | null;
  amount: number;
  vatPct?: number;
  status?: ProformaStatus;
  issueDate?: Date;
  validUntil?: Date | null;
  linkedQuoteId?: string | null;
  linkedInvoiceId?: string | null;
  internalNote?: string | null;
  lines?: ProformaLine[];
  terms?: string | null;
  tags?: string[];
}

const toISODate = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : null;

const fromRow = (r: any): Proforma => ({
  id: r.id,
  number: r.number,
  clientId: r.client_id,
  concept: r.concept,
  amount: Number(r.amount),
  vatPct: Number(r.vat_pct ?? 21),
  status: r.status,
  issueDate: new Date(r.issue_date),
  validUntil: r.valid_until ? new Date(r.valid_until) : null,
  linkedQuoteId: r.linked_quote_id,
  linkedInvoiceId: r.linked_invoice_id,
  internalNote: r.internal_note,
  lines: Array.isArray(r.lines) ? r.lines : [],
  terms: r.terms,
  tags: r.tags || [],
});

const toRow = (p: Partial<Proforma>) => {
  const r: Record<string, unknown> = {};
  if (p.id !== undefined) r.id = p.id;
  if (p.number !== undefined) r.number = p.number;
  if (p.clientId !== undefined) r.client_id = p.clientId;
  if (p.concept !== undefined) r.concept = p.concept;
  if (p.amount !== undefined) r.amount = p.amount;
  if (p.vatPct !== undefined) r.vat_pct = p.vatPct;
  if (p.status !== undefined) r.status = p.status;
  if (p.issueDate !== undefined) r.issue_date = toISODate(p.issueDate);
  if (p.validUntil !== undefined) r.valid_until = toISODate(p.validUntil);
  if (p.linkedQuoteId !== undefined) r.linked_quote_id = p.linkedQuoteId;
  if (p.linkedInvoiceId !== undefined) r.linked_invoice_id = p.linkedInvoiceId;
  if (p.internalNote !== undefined) r.internal_note = p.internalNote;
  if (p.lines !== undefined) r.lines = p.lines;
  if (p.terms !== undefined) r.terms = p.terms;
  if (p.tags !== undefined) r.tags = p.tags;
  return r;
};

export async function fetchProformas(): Promise<Proforma[]> {
  const { data, error } = await supabase
    .from("proformas")
    .select("*")
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

const nextProformaNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, "0");
  return `PF-${year}-${rand}`;
};

export async function createProforma(input: NewProforma): Promise<Proforma> {
  const id = `pf-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const row = toRow({
    id,
    number: input.number || nextProformaNumber(),
    clientId: input.clientId ?? null,
    concept: input.concept ?? null,
    amount: input.amount,
    vatPct: input.vatPct ?? 21,
    status: input.status ?? "pendiente",
    issueDate: input.issueDate ?? new Date(),
    validUntil: input.validUntil ?? new Date(Date.now() + 30 * 86400000),
    linkedQuoteId: input.linkedQuoteId ?? null,
    linkedInvoiceId: input.linkedInvoiceId ?? null,
    internalNote: input.internalNote ?? null,
    lines: input.lines ?? [],
    terms: input.terms ?? null,
    tags: input.tags ?? [],
  });
  const { data, error } = await supabase.from("proformas").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateProforma(id: string, patch: Partial<Proforma>): Promise<Proforma> {
  const { data, error } = await supabase
    .from("proformas")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteProforma(id: string): Promise<void> {
  const { error } = await supabase.from("proformas").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateProforma(id: string): Promise<Proforma> {
  const { data, error } = await supabase.from("proformas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Proforma no encontrada");
  const orig = fromRow(data);
  return createProforma({
    ...orig,
    number: nextProformaNumber(),
    status: "pendiente",
    issueDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 86400000),
    linkedInvoiceId: null,
  });
}
