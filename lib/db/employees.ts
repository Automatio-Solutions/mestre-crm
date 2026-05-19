import { supabase } from "@/lib/supabase/client";

export type ContractType = "Indefinido" | "Temporal" | "Prácticas" | "Autónomo" | "Becario";

export interface Employee {
  id: string;
  name: string;
  role: string | null;
  contractType: ContractType;
  active: boolean;
  grossMonth: number;
  netMonth: number;
  irpf: number;        // IRPF retenido (mensual)
  ssEmployer: number;  // cuota patronal SS
  ssEmployee: number;  // cuota trabajador SS
  email: string | null;
  dni: string | null;
  hireDate: Date | null;
  endDate: Date | null;
  notes: string | null;
}

export interface NewEmployee {
  name: string;
  role?: string | null;
  contractType?: ContractType;
  active?: boolean;
  grossMonth?: number;
  netMonth?: number;
  irpf?: number;
  ssEmployer?: number;
  ssEmployee?: number;
  email?: string | null;
  dni?: string | null;
  hireDate?: Date | null;
  endDate?: Date | null;
  notes?: string | null;
}

const toISODate = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : null;

const fromRow = (r: any): Employee => ({
  id: r.id,
  name: r.name,
  role: r.role,
  contractType: (r.contract_type as ContractType) || "Indefinido",
  active: !!r.active,
  grossMonth: Number(r.gross_month || 0),
  netMonth: Number(r.net_month || 0),
  irpf: Number(r.irpf || 0),
  ssEmployer: Number(r.ss_employer || 0),
  ssEmployee: Number(r.ss_employee || 0),
  email: r.email,
  dni: r.dni,
  hireDate: r.hire_date ? new Date(r.hire_date) : null,
  endDate: r.end_date ? new Date(r.end_date) : null,
  notes: r.notes,
});

const toRow = (e: Partial<Employee>) => {
  const r: Record<string, unknown> = {};
  if (e.id !== undefined) r.id = e.id;
  if (e.name !== undefined) r.name = e.name;
  if (e.role !== undefined) r.role = e.role;
  if (e.contractType !== undefined) r.contract_type = e.contractType;
  if (e.active !== undefined) r.active = e.active;
  if (e.grossMonth !== undefined) r.gross_month = e.grossMonth;
  if (e.netMonth !== undefined) r.net_month = e.netMonth;
  if (e.irpf !== undefined) r.irpf = e.irpf;
  if (e.ssEmployer !== undefined) r.ss_employer = e.ssEmployer;
  if (e.ssEmployee !== undefined) r.ss_employee = e.ssEmployee;
  if (e.email !== undefined) r.email = e.email;
  if (e.dni !== undefined) r.dni = e.dni;
  if (e.hireDate !== undefined) r.hire_date = toISODate(e.hireDate);
  if (e.endDate !== undefined) r.end_date = toISODate(e.endDate);
  if (e.notes !== undefined) r.notes = e.notes;
  return r;
};

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("active", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createEmployee(input: NewEmployee): Promise<Employee> {
  const id = `e-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const row = toRow({
    id,
    name: input.name.trim(),
    role: input.role ?? null,
    contractType: input.contractType ?? "Indefinido",
    active: input.active ?? true,
    grossMonth: input.grossMonth ?? 0,
    netMonth: input.netMonth ?? 0,
    irpf: input.irpf ?? 0,
    ssEmployer: input.ssEmployer ?? 0,
    ssEmployee: input.ssEmployee ?? 0,
    email: input.email ?? null,
    dni: input.dni ?? null,
    hireDate: input.hireDate ?? null,
    endDate: input.endDate ?? null,
    notes: input.notes ?? null,
  });
  const { data, error } = await supabase.from("employees").insert(row).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateEmployee(id: string, patch: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from("employees")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw error;
}
