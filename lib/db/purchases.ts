import { supabase } from "@/lib/supabase/client";
import type { InvoiceLine } from "./invoices";

export type PurchaseStatus = "borrador" | "pendiente" | "pagada" | "vencida";
export type PurchaseSource = "upload" | "email" | "scan";
export type PurchasePaymentMethod = "transferencia" | "tarjeta" | "domiciliado" | "efectivo" | "none";

// Reutilizamos la estructura de línea (concept, description, quantity, price, vat, discount)
export type PurchaseLine = InvoiceLine;

export interface Purchase {
  id: string;
  supplierId: string | null;
  number: string | null;
  concept: string | null;
  category: string | null;
  issueDate: Date;
  payDate: Date | null;
  base: number;
  vatPct: number;
  vat: number;
  total: number;
  status: PurchaseStatus;
  paymentMethod: PurchasePaymentMethod;
  source: PurchaseSource;
  account: string | null;
  lines: PurchaseLine[];
  tags: string[];
  attachments: string[];
  internalNote: string | null;
  docText: string | null;
}

export interface NewPurchase {
  supplierId?: string | null;
  number?: string | null;
  concept?: string | null;
  category?: string | null;
  issueDate: Date;
  payDate?: Date | null;
  base: number;
  vatPct: number;
  vat: number;
  total: number;
  status?: PurchaseStatus;
  paymentMethod?: PurchasePaymentMethod;
  source?: PurchaseSource;
  account?: string | null;
  lines?: PurchaseLine[];
  tags?: string[];
  attachments?: string[];
  internalNote?: string | null;
  docText?: string | null;
}

const toISODate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

const fromRow = (r: any): Purchase => ({
  id: r.id,
  supplierId: r.supplier_id,
  number: r.number,
  concept: r.concept,
  category: r.category,
  issueDate: new Date(r.issue_date),
  payDate: r.pay_date ? new Date(r.pay_date) : null,
  base: Number(r.base),
  vatPct: Number(r.vat_pct),
  vat: Number(r.vat),
  total: Number(r.total),
  status: r.status,
  paymentMethod: r.payment_method || "transferencia",
  source: r.source || "upload",
  account: r.account,
  lines: Array.isArray(r.lines) ? r.lines : [],
  tags: r.tags || [],
  attachments: r.attachments || [],
  internalNote: r.internal_note,
  docText: r.doc_text,
});

const toRow = (p: Partial<Purchase>) => {
  const r: Record<string, unknown> = {};
  if (p.id !== undefined) r.id = p.id;
  if (p.supplierId !== undefined) r.supplier_id = p.supplierId;
  if (p.number !== undefined) r.number = p.number;
  if (p.concept !== undefined) r.concept = p.concept;
  if (p.category !== undefined) r.category = p.category;
  if (p.issueDate !== undefined) r.issue_date = toISODate(p.issueDate);
  if (p.payDate !== undefined) r.pay_date = toISODate(p.payDate);
  if (p.base !== undefined) r.base = p.base;
  if (p.vatPct !== undefined) r.vat_pct = p.vatPct;
  if (p.vat !== undefined) r.vat = p.vat;
  if (p.total !== undefined) r.total = p.total;
  if (p.status !== undefined) r.status = p.status;
  if (p.paymentMethod !== undefined) r.payment_method = p.paymentMethod;
  if (p.source !== undefined) r.source = p.source;
  if (p.account !== undefined) r.account = p.account;
  if (p.lines !== undefined) r.lines = p.lines;
  if (p.tags !== undefined) r.tags = p.tags;
  if (p.attachments !== undefined) r.attachments = p.attachments;
  if (p.internalNote !== undefined) r.internal_note = p.internalNote;
  if (p.docText !== undefined) r.doc_text = p.docText;
  return r;
};

export async function fetchPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createPurchase(input: NewPurchase): Promise<Purchase> {
  const id = `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const row = toRow({
    id,
    ...input,
    status: input.status ?? "pendiente",
    paymentMethod: input.paymentMethod ?? "transferencia",
    source: input.source ?? "upload",
    lines: input.lines ?? [],
    tags: input.tags ?? [],
    attachments: input.attachments ?? [],
  });
  const { data, error } = await supabase.from("purchases").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updatePurchase(id: string, patch: Partial<Purchase>): Promise<Purchase> {
  const { data, error } = await supabase
    .from("purchases")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deletePurchase(id: string): Promise<void> {
  const { error } = await supabase.from("purchases").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicatePurchase(id: string): Promise<Purchase> {
  const { data, error } = await supabase.from("purchases").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Compra no encontrada");
  const orig = fromRow(data);
  const { id: _skip, ...rest } = orig;
  return createPurchase({
    ...rest,
    issueDate: new Date(),
    payDate: null,
    status: "borrador",
  });
}
