import { supabase } from "@/lib/supabase/client";
import type { InvoiceLine } from "./invoices";

export type QuoteStatus = "borrador" | "enviado" | "negociando" | "aceptado" | "rechazado";

// Reutilizamos el tipo de línea de factura: mismos campos (concept, description, quantity, price, vat, discount)
export type QuoteLine = InvoiceLine;

export interface Quote {
  id: string;
  number: string;
  clientId: string | null;
  concept: string | null;
  amount: number;
  vatPct: number;
  status: QuoteStatus;
  issueDate: Date;
  expireDate: Date | null;
  owner: string | null;
  probability: number;
  viewed: boolean;
  viewCount: number;
  acceptedDate: Date | null;
  rejectedDate: Date | null;
  rejectReason: string | null;
  internalNote: string | null;
  source: string | null;
  // ---- ampliaciones ----
  lines: QuoteLine[];
  terms: string | null;
  tags: string[];
  showCustomFields: boolean;
  docText: string | null;
  docFooterMessage: string | null;
}

export interface NewQuote {
  number?: string;
  clientId?: string | null;
  concept?: string | null;
  amount: number;
  vatPct?: number;
  status?: QuoteStatus;
  issueDate?: Date;
  expireDate?: Date | null;
  owner?: string | null;
  probability?: number;
  source?: string | null;
  internalNote?: string | null;
  lines?: QuoteLine[];
  terms?: string | null;
  tags?: string[];
  showCustomFields?: boolean;
  docText?: string | null;
  docFooterMessage?: string | null;
}

const toISODate = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : null;

const fromRow = (r: any): Quote => ({
  id: r.id,
  number: r.number,
  clientId: r.client_id,
  concept: r.concept,
  amount: Number(r.amount),
  vatPct: Number(r.vat_pct ?? 21),
  status: r.status,
  issueDate: new Date(r.issue_date),
  expireDate: r.expire_date ? new Date(r.expire_date) : null,
  owner: r.owner,
  probability: Number(r.probability || 0),
  viewed: !!r.viewed,
  viewCount: Number(r.view_count || 0),
  acceptedDate: r.accepted_date ? new Date(r.accepted_date) : null,
  rejectedDate: r.rejected_date ? new Date(r.rejected_date) : null,
  rejectReason: r.reject_reason,
  internalNote: r.internal_note,
  source: r.source,
  lines: Array.isArray(r.lines) ? r.lines : [],
  terms: r.terms,
  tags: r.tags || [],
  showCustomFields: !!r.show_custom_fields,
  docText: r.doc_text,
  docFooterMessage: r.doc_footer_message,
});

const toRow = (q: Partial<Quote>) => {
  const r: Record<string, unknown> = {};
  if (q.id !== undefined) r.id = q.id;
  if (q.number !== undefined) r.number = q.number;
  if (q.clientId !== undefined) r.client_id = q.clientId;
  if (q.concept !== undefined) r.concept = q.concept;
  if (q.amount !== undefined) r.amount = q.amount;
  if (q.vatPct !== undefined) r.vat_pct = q.vatPct;
  if (q.status !== undefined) r.status = q.status;
  if (q.issueDate !== undefined) r.issue_date = toISODate(q.issueDate);
  if (q.expireDate !== undefined) r.expire_date = toISODate(q.expireDate);
  if (q.owner !== undefined) r.owner = q.owner;
  if (q.probability !== undefined) r.probability = q.probability;
  if (q.viewed !== undefined) r.viewed = q.viewed;
  if (q.viewCount !== undefined) r.view_count = q.viewCount;
  if (q.acceptedDate !== undefined) r.accepted_date = toISODate(q.acceptedDate);
  if (q.rejectedDate !== undefined) r.rejected_date = toISODate(q.rejectedDate);
  if (q.rejectReason !== undefined) r.reject_reason = q.rejectReason;
  if (q.internalNote !== undefined) r.internal_note = q.internalNote;
  if (q.source !== undefined) r.source = q.source;
  if (q.lines !== undefined) r.lines = q.lines;
  if (q.terms !== undefined) r.terms = q.terms;
  if (q.tags !== undefined) r.tags = q.tags;
  if (q.showCustomFields !== undefined) r.show_custom_fields = q.showCustomFields;
  if (q.docText !== undefined) r.doc_text = q.docText;
  if (q.docFooterMessage !== undefined) r.doc_footer_message = q.docFooterMessage;
  return r;
};

export async function fetchQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

const nextQuoteNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, "0");
  return `PR-${year}-${rand}`;
};

export async function createQuote(input: NewQuote): Promise<Quote> {
  const id = `q-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const row = toRow({
    id,
    number: input.number || nextQuoteNumber(),
    clientId: input.clientId ?? null,
    concept: input.concept ?? null,
    amount: input.amount,
    vatPct: input.vatPct ?? 21,
    status: input.status ?? "borrador",
    issueDate: input.issueDate ?? new Date(),
    expireDate: input.expireDate ?? null,
    owner: input.owner ?? null,
    probability: input.probability ?? 30,
    viewed: false,
    viewCount: 0,
    source: input.source ?? null,
    internalNote: input.internalNote ?? null,
    lines: input.lines ?? [],
    terms: input.terms ?? null,
    tags: input.tags ?? [],
    showCustomFields: input.showCustomFields ?? false,
    docText: input.docText ?? null,
    docFooterMessage: input.docFooterMessage ?? null,
  });
  const { data, error } = await supabase.from("quotes").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function duplicateQuote(id: string): Promise<Quote> {
  const { data, error } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Presupuesto no encontrado");
  const orig = fromRow(data);
  return createQuote({
    ...orig,
    number: nextQuoteNumber(),
    status: "borrador",
    issueDate: new Date(),
    expireDate: new Date(Date.now() + 30 * 86400000),
  });
}

export async function updateQuote(id: string, patch: Partial<Quote>): Promise<Quote> {
  const { data, error } = await supabase
    .from("quotes")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) throw error;
}
