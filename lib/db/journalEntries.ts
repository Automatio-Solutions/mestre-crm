import { supabase } from "@/lib/supabase/client";

export type JournalSourceType = "manual" | "invoice" | "purchase" | "payroll" | "bank";

export interface JournalLine {
  id: string;
  entryId: string;
  lineNo: number;
  accountCode: string;
  concept: string | null;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  number: string;
  date: Date;
  description: string | null;
  docRef: string | null;
  sourceType: JournalSourceType;
  sourceId: string | null;
  lines: JournalLine[];   // siempre cargado en fetch
}

export interface NewJournalEntry {
  number?: string;                     // si no, autogenera
  date: Date;
  description?: string | null;
  docRef?: string | null;
  sourceType?: JournalSourceType;
  sourceId?: string | null;
  lines: Array<Omit<JournalLine, "id" | "entryId" | "lineNo">>;
}

// ============================================================
// Helpers
// ============================================================
const toISODate = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : null;

const round2 = (n: number) => Math.round(n * 100) / 100;

const fromEntryRow = (r: any, lines: JournalLine[] = []): JournalEntry => ({
  id: r.id,
  number: r.number,
  date: new Date(r.date),
  description: r.description,
  docRef: r.doc_ref,
  sourceType: (r.source_type as JournalSourceType) || "manual",
  sourceId: r.source_id,
  lines,
});

const fromLineRow = (r: any): JournalLine => ({
  id: r.id,
  entryId: r.entry_id,
  lineNo: r.line_no,
  accountCode: r.account_code,
  concept: r.concept,
  debit: Number(r.debit || 0),
  credit: Number(r.credit || 0),
});

/** Suma debe y haber y devuelve diferencia (debe debe ser 0 para asiento válido). */
export const totalsOf = (lines: { debit: number; credit: number }[]) => {
  const debit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const credit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  return {
    debit: round2(debit),
    credit: round2(credit),
    diff: round2(debit - credit),
    balanced: Math.abs(round2(debit - credit)) < 0.005 && debit > 0,
  };
};

const nextEntryNumber = async () => {
  // Busca el mayor número existente "A-NNNN" y suma 1
  const { data } = await supabase
    .from("journal_entries")
    .select("number")
    .order("number", { ascending: false })
    .limit(1);
  const last = data?.[0]?.number || "A-0000";
  const m = last.match(/A-(\d+)/);
  const n = m ? parseInt(m[1], 10) : 0;
  return `A-${String(n + 1).padStart(4, "0")}`;
};

// ============================================================
// CRUD
// ============================================================
export async function fetchJournalEntries(): Promise<JournalEntry[]> {
  const { data: entries, error: e1 } = await supabase
    .from("journal_entries")
    .select("*")
    .order("date", { ascending: false })
    .order("number", { ascending: false });
  if (e1) throw e1;
  if (!entries || entries.length === 0) return [];

  const ids = entries.map((e: any) => e.id);
  const { data: lineRows, error: e2 } = await supabase
    .from("journal_entry_lines")
    .select("*")
    .in("entry_id", ids)
    .order("line_no", { ascending: true });
  if (e2) throw e2;

  const linesByEntry = new Map<string, JournalLine[]>();
  (lineRows || []).forEach((row: any) => {
    const l = fromLineRow(row);
    if (!linesByEntry.has(l.entryId)) linesByEntry.set(l.entryId, []);
    linesByEntry.get(l.entryId)!.push(l);
  });

  return entries.map((e: any) => fromEntryRow(e, linesByEntry.get(e.id) || []));
}

export async function createJournalEntry(input: NewJournalEntry): Promise<JournalEntry> {
  const totals = totalsOf(input.lines);
  if (!totals.balanced) {
    throw new Error(`El asiento no está cuadrado (Debe ${totals.debit} ≠ Haber ${totals.credit}).`);
  }
  if (input.lines.length < 2) {
    throw new Error("Un asiento contable debe tener al menos dos líneas.");
  }

  const number = (input.number && input.number.trim()) || (await nextEntryNumber());
  const id = `je-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;

  const entryRow = {
    id,
    number,
    date: toISODate(input.date),
    description: input.description ?? null,
    doc_ref: input.docRef ?? null,
    source_type: input.sourceType || "manual",
    source_id: input.sourceId ?? null,
  };
  const { data: ent, error: e1 } = await supabase.from("journal_entries").insert(entryRow).select().single();
  if (e1) throw e1;

  const lineRows = input.lines.map((l, idx) => ({
    id: `jl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}-${idx}`,
    entry_id: id,
    line_no: idx + 1,
    account_code: l.accountCode.trim(),
    concept: l.concept || null,
    debit: round2(l.debit || 0),
    credit: round2(l.credit || 0),
  }));
  const { data: ln, error: e2 } = await supabase.from("journal_entry_lines").insert(lineRows).select();
  if (e2) {
    // Si falla insertar líneas, deshacer cabecera
    await supabase.from("journal_entries").delete().eq("id", id);
    throw e2;
  }

  return fromEntryRow(ent, (ln || []).map(fromLineRow));
}

export async function updateJournalEntry(
  id: string,
  patch: Partial<Omit<JournalEntry, "lines">> & { lines?: Array<Omit<JournalLine, "id" | "entryId" | "lineNo">> },
): Promise<JournalEntry> {
  const headerPatch: Record<string, unknown> = {};
  if (patch.number !== undefined) headerPatch.number = patch.number;
  if (patch.date !== undefined) headerPatch.date = toISODate(patch.date);
  if (patch.description !== undefined) headerPatch.description = patch.description;
  if (patch.docRef !== undefined) headerPatch.doc_ref = patch.docRef;
  if (patch.sourceType !== undefined) headerPatch.source_type = patch.sourceType;
  if (patch.sourceId !== undefined) headerPatch.source_id = patch.sourceId;

  if (Object.keys(headerPatch).length > 0) {
    const { error } = await supabase.from("journal_entries").update(headerPatch).eq("id", id);
    if (error) throw error;
  }

  // Reemplazo total de líneas si vienen
  if (patch.lines !== undefined) {
    const totals = totalsOf(patch.lines);
    if (!totals.balanced) {
      throw new Error(`El asiento no está cuadrado (Debe ${totals.debit} ≠ Haber ${totals.credit}).`);
    }
    if (patch.lines.length < 2) {
      throw new Error("Un asiento contable debe tener al menos dos líneas.");
    }
    await supabase.from("journal_entry_lines").delete().eq("entry_id", id);
    const lineRows = patch.lines.map((l, idx) => ({
      id: `jl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}-${idx}`,
      entry_id: id,
      line_no: idx + 1,
      account_code: l.accountCode.trim(),
      concept: l.concept || null,
      debit: round2(l.debit || 0),
      credit: round2(l.credit || 0),
    }));
    const { error } = await supabase.from("journal_entry_lines").insert(lineRows);
    if (error) throw error;
  }

  // Recargar entrada completa
  const { data: ent } = await supabase.from("journal_entries").select("*").eq("id", id).single();
  const { data: ln } = await supabase.from("journal_entry_lines").select("*").eq("entry_id", id).order("line_no");
  return fromEntryRow(ent, (ln || []).map(fromLineRow));
}

export async function deleteJournalEntry(id: string): Promise<void> {
  // ON DELETE CASCADE en la FK borra las líneas automáticamente
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) throw error;
}
