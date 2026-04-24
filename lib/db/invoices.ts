import { supabase } from "@/lib/supabase/client";

export type InvoiceStatus = "borrador" | "pendiente" | "pagada" | "vencida" | "enviada";

export interface InvoiceLine {
  id: string;
  concept: string;
  description: string;
  quantity: number;
  price: number;
  vat: number;        // %
  discount: number;   // %
  serviceId?: string | null;
}

export type PaymentMethod =
  | "none"
  | "transferencia"
  | "contado"
  | "domiciliado";

export interface Invoice {
  id: string;
  number: string;
  clientId: string | null;
  issueDate: Date;
  dueDate: Date | null;
  base: number;
  vatPct: number;
  total: number;
  status: InvoiceStatus;
  concept: string | null;
  // ---- nuevos campos ----
  lines: InvoiceLine[];
  paymentMethod: PaymentMethod;
  paymentNotes: string | null;
  account: string | null;
  accountByConcept: boolean;
  internalNote: string | null;
  tags: string[];
  showCustomFields: boolean;
  docText: string | null;
  docFooterMessage: string | null;
}

export interface NewInvoice {
  number: string;
  clientId: string | null;
  issueDate: Date;
  dueDate?: Date | null;
  base: number;
  vatPct: number;
  total: number;
  status?: InvoiceStatus;
  concept?: string | null;
  lines?: InvoiceLine[];
  paymentMethod?: PaymentMethod;
  paymentNotes?: string | null;
  account?: string | null;
  accountByConcept?: boolean;
  internalNote?: string | null;
  tags?: string[];
  showCustomFields?: boolean;
  docText?: string | null;
  docFooterMessage?: string | null;
}

const fromRow = (r: any): Invoice => ({
  id: r.id,
  number: r.number,
  clientId: r.client_id,
  issueDate: new Date(r.issue_date),
  dueDate: r.due_date ? new Date(r.due_date) : null,
  base: Number(r.base),
  vatPct: Number(r.vat_pct),
  total: Number(r.total),
  status: r.status,
  concept: r.concept,
  lines: Array.isArray(r.lines) ? r.lines : [],
  paymentMethod: r.payment_method || "transferencia",
  paymentNotes: r.payment_notes,
  account: r.account,
  accountByConcept: !!r.account_by_concept,
  internalNote: r.internal_note,
  tags: r.tags || [],
  showCustomFields: !!r.show_custom_fields,
  docText: r.doc_text,
  docFooterMessage: r.doc_footer_message,
});

const toRow = (i: Partial<Invoice>) => {
  const r: Record<string, unknown> = {};
  if (i.id !== undefined) r.id = i.id;
  if (i.number !== undefined) r.number = i.number;
  if (i.clientId !== undefined) r.client_id = i.clientId;
  if (i.issueDate !== undefined) r.issue_date = i.issueDate.toISOString().slice(0, 10);
  if (i.dueDate !== undefined) r.due_date = i.dueDate ? i.dueDate.toISOString().slice(0, 10) : null;
  if (i.base !== undefined) r.base = i.base;
  if (i.vatPct !== undefined) r.vat_pct = i.vatPct;
  if (i.total !== undefined) r.total = i.total;
  if (i.status !== undefined) r.status = i.status;
  if (i.concept !== undefined) r.concept = i.concept;
  if (i.lines !== undefined) r.lines = i.lines;
  if (i.paymentMethod !== undefined) r.payment_method = i.paymentMethod;
  if (i.paymentNotes !== undefined) r.payment_notes = i.paymentNotes;
  if (i.account !== undefined) r.account = i.account;
  if (i.accountByConcept !== undefined) r.account_by_concept = i.accountByConcept;
  if (i.internalNote !== undefined) r.internal_note = i.internalNote;
  if (i.tags !== undefined) r.tags = i.tags;
  if (i.showCustomFields !== undefined) r.show_custom_fields = i.showCustomFields;
  if (i.docText !== undefined) r.doc_text = i.docText;
  if (i.docFooterMessage !== undefined) r.doc_footer_message = i.docFooterMessage;
  return r;
};

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function fetchInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

const nextNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, "0");
  return `${year}/${rand}`;
};

export async function createInvoice(input: NewInvoice): Promise<Invoice> {
  const id = `f-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const row = toRow({
    id,
    ...input,
    status: input.status || "borrador",
    lines: input.lines || [],
    paymentMethod: input.paymentMethod || "transferencia",
    tags: input.tags || [],
  });
  const { data, error } = await supabase.from("invoices").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function duplicateInvoice(id: string): Promise<Invoice> {
  const orig = await fetchInvoice(id);
  if (!orig) throw new Error("Factura no encontrada");
  const { id: _skip, ...rest } = orig;
  return createInvoice({
    ...rest,
    number: nextNumber(),
    status: "borrador",
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
  });
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// Helpers de cálculo
// ============================================================
export const calcLineSubtotal = (l: InvoiceLine) =>
  l.quantity * l.price * (1 - (l.discount || 0) / 100);

export const calcLineVat = (l: InvoiceLine) =>
  calcLineSubtotal(l) * ((l.vat || 0) / 100);

export const calcInvoiceTotals = (lines: InvoiceLine[]) => {
  const base = lines.reduce((s, l) => s + calcLineSubtotal(l), 0);
  const vat = lines.reduce((s, l) => s + calcLineVat(l), 0);
  return {
    base: +base.toFixed(2),
    vat: +vat.toFixed(2),
    total: +(base + vat).toFixed(2),
  };
};

export const emptyLine = (): InvoiceLine => ({
  id: `l-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`,
  concept: "",
  description: "",
  quantity: 1,
  price: 0,
  vat: 21,
  discount: 0,
  serviceId: null,
});
