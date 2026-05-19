import { supabase } from "@/lib/supabase/client";

export type AccountType = "activo" | "pasivo" | "patrimonio" | "ingreso" | "gasto";

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
  groupCode: string | null;       // "1"…"9" del PGC
  parentCode: string | null;
  description: string | null;
  active: boolean;
}

export interface NewChartAccount {
  code: string;
  name: string;
  accountType: AccountType;
  groupCode?: string | null;
  parentCode?: string | null;
  description?: string | null;
  active?: boolean;
}

const fromRow = (r: any): ChartAccount => ({
  id: r.id,
  code: r.code,
  name: r.name,
  accountType: r.account_type as AccountType,
  groupCode: r.group_code,
  parentCode: r.parent_code,
  description: r.description,
  active: !!r.active,
});

const toRow = (a: Partial<ChartAccount>) => {
  const r: Record<string, unknown> = {};
  if (a.id !== undefined) r.id = a.id;
  if (a.code !== undefined) r.code = a.code;
  if (a.name !== undefined) r.name = a.name;
  if (a.accountType !== undefined) r.account_type = a.accountType;
  if (a.groupCode !== undefined) r.group_code = a.groupCode;
  if (a.parentCode !== undefined) r.parent_code = a.parentCode;
  if (a.description !== undefined) r.description = a.description;
  if (a.active !== undefined) r.active = a.active;
  return r;
};

export async function fetchChartAccounts(): Promise<ChartAccount[]> {
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .order("code", { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

const inferGroupCode = (code: string): string => {
  const first = (code || "").trim().charAt(0);
  return /[1-9]/.test(first) ? first : "";
};

export async function createChartAccount(input: NewChartAccount): Promise<ChartAccount> {
  const id = `coa-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const row = toRow({
    id,
    code: input.code.trim(),
    name: input.name.trim(),
    accountType: input.accountType,
    groupCode: input.groupCode ?? inferGroupCode(input.code) ?? null,
    parentCode: input.parentCode ?? null,
    description: input.description ?? null,
    active: input.active ?? true,
  });
  const { data, error } = await supabase.from("chart_of_accounts").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateChartAccount(id: string, patch: Partial<ChartAccount>): Promise<ChartAccount> {
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteChartAccount(id: string): Promise<void> {
  const { error } = await supabase.from("chart_of_accounts").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// Mapa de grupos del PGC español (para mostrar etiquetas)
// ============================================================
export const PGC_GROUPS: Record<string, { name: string; type: AccountType }> = {
  "1": { name: "Financiación básica",                  type: "patrimonio" },
  "2": { name: "Activo no corriente",                  type: "activo" },
  "3": { name: "Existencias",                          type: "activo" },
  "4": { name: "Acreedores y deudores por operaciones", type: "activo" }, // mixed; UI muestra detalle
  "5": { name: "Cuentas financieras",                  type: "activo" },
  "6": { name: "Compras y gastos",                     type: "gasto" },
  "7": { name: "Ventas e ingresos",                    type: "ingreso" },
  "8": { name: "Gastos imputados al patrimonio neto",  type: "gasto" },
  "9": { name: "Ingresos imputados al patrimonio neto", type: "ingreso" },
};

export const ACCOUNT_TYPES: { id: AccountType; label: string; color: string }[] = [
  { id: "activo",     label: "Activo",     color: "#4A7C59" },
  { id: "pasivo",     label: "Pasivo",     color: "#B84545" },
  { id: "patrimonio", label: "Patrimonio", color: "#6A5ACD" },
  { id: "ingreso",    label: "Ingreso",    color: "#2F5A3D" },
  { id: "gasto",      label: "Gasto",      color: "#C89B3C" },
];
