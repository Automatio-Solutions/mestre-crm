"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Icon, Button, Card, Badge, Input, EmptyState, Modal,
  Dropdown, DropdownItem, DropdownSeparator, useConfirm,
} from "@/components/ui";
import { Th, Td } from "@/components/screens/contactos";
import { StatCard } from "@/components/screens/ventas/shared";
import { ComprasHeader } from "./shared";
import { useEmployees } from "@/lib/db/useEmployees";
import type { Employee, NewEmployee, ContractType } from "@/lib/db/employees";

const CONTRACT_TYPES: ContractType[] = ["Indefinido", "Temporal", "Prácticas", "Autónomo", "Becario"];

// CSV helpers
const csvEscape = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvDate = (d: any) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
};
function downloadCSV(filename: string, rows: any[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function NominasScreen() {
  const confirm = useConfirm();
  const { employees, loading, create, update, remove } = useEmployees();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: Employee) => { setEditing(e); setFormOpen(true); };

  // Stats sólo de empleados activos
  const summary = useMemo(() => {
    const actives = employees.filter((e) => e.active);
    return {
      monthTotal: actives.reduce((s, e) => s + e.grossMonth, 0),
      irpfRetained: actives.reduce((s, e) => s + e.irpf, 0),
      ssPatronal: actives.reduce((s, e) => s + e.ssEmployer, 0),
      ssTrabajador: actives.reduce((s, e) => s + e.ssEmployee, 0),
      activos: actives.length,
      bajas: employees.length - actives.length,
    };
  }, [employees]);

  const filtered = useMemo(() => {
    let r = employees;
    if (!showInactive) r = r.filter((e) => e.active);
    if (search.trim()) {
      const lq = search.toLowerCase();
      r = r.filter((e) =>
        [e.name, e.role, e.email, e.dni].filter(Boolean).join(" ").toLowerCase().includes(lq)
      );
    }
    return r;
  }, [employees, search, showInactive]);

  const handleSubmit = async (values: NewEmployee) => {
    if (editing) await update(editing.id, values);
    else await create(values);
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async (e: Employee) => {
    const ok = await confirm({
      title: "Eliminar empleado",
      message: `¿Seguro que quieres eliminar a ${e.name}? Esta acción no se puede deshacer.`,
      danger: true,
    });
    if (!ok) return;
    await remove(e.id);
  };

  const exportCSV = () => {
    const headers = [
      "Nombre", "Puesto", "Contrato", "Estado",
      "Email", "DNI",
      "Bruto mes", "Neto mes", "IRPF", "SS patronal", "SS trabajador",
      "Fecha alta", "Fecha baja", "Notas",
    ];
    const rows = filtered.map((e) => [
      e.name, e.role || "", e.contractType, e.active ? "alta" : "baja",
      e.email || "", e.dni || "",
      e.grossMonth, e.netMonth, e.irpf, e.ssEmployer, e.ssEmployee,
      csvDate(e.hireDate), csvDate(e.endDate), e.notes || "",
    ]);
    downloadCSV(`nominas_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <ComprasHeader
        section="Nóminas"
        title="Nóminas"
        description="Empleados, nóminas mensuales y cotizaciones sociales"
        primary={{ label: "Nuevo empleado", icon: "plus", onClick: openNew }}
        onExport={exportCSV}
        exportDisabled={filtered.length === 0}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard label="Total bruto mes" value={summary.monthTotal} sub={`${summary.activos} empleados activos`} />
        <StatCard label="IRPF retenido" value={summary.irpfRetained} color="var(--warning)" sub="A liquidar modelo 111" />
        <StatCard label="SS patronal" value={summary.ssPatronal} color="var(--purple)" sub="Cuota empresa" />
        <StatCard label="SS trabajador" value={summary.ssTrabajador} sub="Retención cuota obrera" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nombre, puesto, email…"
            leftIcon={<Icon name="search" size={14} />}
          />
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostrar bajas {summary.bajas > 0 && <span>({summary.bajas})</span>}
        </label>
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Cargando empleados…
        </div>
      )}

      {!loading && employees.length === 0 && (
        <EmptyState
          icon={<Icon name="users" size={28} />}
          title="Sin empleados"
          description="Añade tu primer empleado para empezar a llevar el control de nóminas, IRPF y Seguridad Social."
          action={
            <Button variant="primary" leftIcon={<Icon name="plus" size={14} />} onClick={openNew}>
              Nuevo empleado
            </Button>
          }
        />
      )}

      {!loading && employees.length > 0 && (
        <Card padding={0} style={{ overflow: "visible" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 500 }}>
            Empleados {showInactive ? "" : "activos"}
          </div>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--beige-bg)" }}>
                <Th>Empleado</Th>
                <Th>Puesto</Th>
                <Th>Contrato</Th>
                <Th align="right">Bruto/mes</Th>
                <Th align="right">Neto/mes</Th>
                <Th align="right">IRPF</Th>
                <Th>Estado</Th>
                <Th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    Sin resultados.
                  </td>
                </tr>
              )}
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => openEdit(e)}
                  style={{ borderTop: "1px solid var(--border)", cursor: "pointer", opacity: e.active ? 1 : 0.6 }}
                  onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--beige-bg)")}
                  onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                >
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, background: "var(--beige)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {e.name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{e.name}</div>
                        {e.email && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{e.email}</div>}
                      </div>
                    </div>
                  </Td>
                  <Td muted>{e.role || "—"}</Td>
                  <Td><Badge tone="neutral">{e.contractType}</Badge></Td>
                  <Td align="right" mono>
                    {e.grossMonth.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                  </Td>
                  <Td align="right" mono>
                    {e.netMonth.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                  </Td>
                  <Td align="right" mono muted>
                    {e.irpf.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                  </Td>
                  <Td><Badge tone={e.active ? "success" : "outline"}>{e.active ? "Alta" : "Baja"}</Badge></Td>
                  <Td onClick={(ev: React.MouseEvent) => ev.stopPropagation()}>
                    <Dropdown
                      align="end"
                      trigger={
                        <button style={{ color: "var(--text-faint)", padding: 4, borderRadius: 4 }} title="Acciones">
                          <Icon name="moreV" size={14} />
                        </button>
                      }
                    >
                      <DropdownItem leftIcon={<Icon name="edit" size={13} />} onClick={() => openEdit(e)}>
                        Editar
                      </DropdownItem>
                      <DropdownItem
                        leftIcon={<Icon name={e.active ? "x" : "check"} size={13} />}
                        onClick={() => update(e.id, {
                          active: !e.active,
                          endDate: e.active ? new Date() : null,
                        })}
                      >
                        {e.active ? "Dar de baja" : "Dar de alta"}
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem danger leftIcon={<Icon name="trash" size={13} />} onClick={() => handleDelete(e)}>
                        Eliminar
                      </DropdownItem>
                    </Dropdown>
                  </Td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: "1.5px solid var(--border-strong)", background: "var(--beige-bg)" }}>
                  <Td colSpan={3}>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Totales ({filtered.length})
                    </span>
                  </Td>
                  <Td align="right" mono style={{ fontWeight: 600 }}>
                    {filtered.reduce((s, e) => s + e.grossMonth, 0).toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                  </Td>
                  <Td align="right" mono style={{ fontWeight: 600 }}>
                    {filtered.reduce((s, e) => s + e.netMonth, 0).toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                  </Td>
                  <Td align="right" mono style={{ fontWeight: 600 }}>
                    {filtered.reduce((s, e) => s + e.irpf, 0).toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                  </Td>
                  <Td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </Card>
      )}

      <EmployeeFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initial={editing}
      />
    </div>
  );
}

// ============================================================
// Modal Nuevo / Editar empleado
// ============================================================
function EmployeeFormModal({
  open, onClose, onSubmit, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NewEmployee) => Promise<void>;
  initial: Employee | null;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [contractType, setContractType] = useState<ContractType>("Indefinido");
  const [active, setActive] = useState(true);
  const [grossMonth, setGrossMonth] = useState<number>(0);
  const [netMonth, setNetMonth] = useState<number>(0);
  const [irpf, setIrpf] = useState<number>(0);
  const [ssEmployer, setSsEmployer] = useState<number>(0);
  const [ssEmployee, setSsEmployee] = useState<number>(0);
  const [email, setEmail] = useState("");
  const [dni, setDni] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setRole(initial.role || "");
      setContractType(initial.contractType);
      setActive(initial.active);
      setGrossMonth(initial.grossMonth);
      setNetMonth(initial.netMonth);
      setIrpf(initial.irpf);
      setSsEmployer(initial.ssEmployer);
      setSsEmployee(initial.ssEmployee);
      setEmail(initial.email || "");
      setDni(initial.dni || "");
      setHireDate(initial.hireDate ? initial.hireDate.toISOString().slice(0, 10) : "");
      setEndDate(initial.endDate ? initial.endDate.toISOString().slice(0, 10) : "");
      setNotes(initial.notes || "");
    } else {
      setName(""); setRole("");
      setContractType("Indefinido"); setActive(true);
      setGrossMonth(0); setNetMonth(0); setIrpf(0); setSsEmployer(0); setSsEmployee(0);
      setEmail(""); setDni("");
      setHireDate(new Date().toISOString().slice(0, 10));
      setEndDate("");
      setNotes("");
    }
    setErr(null);
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("El nombre es obligatorio.");
    setSaving(true);
    setErr(null);
    try {
      await onSubmit({
        name: name.trim(),
        role: role.trim() || null,
        contractType,
        active,
        grossMonth: Number(grossMonth) || 0,
        netMonth: Number(netMonth) || 0,
        irpf: Number(irpf) || 0,
        ssEmployer: Number(ssEmployer) || 0,
        ssEmployee: Number(ssEmployee) || 0,
        email: email.trim() || null,
        dni: dni.trim() || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes: notes.trim() || null,
      });
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={640}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {initial ? "Editar empleado" : "Nuevo empleado"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            Datos de empleado y desglose de su nómina mensual.
          </p>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
          {/* --- Datos personales --- */}
          <FormSection title="Datos del empleado">
            <FormField label="Nombre completo *">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Noelia Pérez García" autoFocus />
            </FormField>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Puesto">
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Diseñadora senior" />
              </FormField>
              <FormField label="Tipo de contrato">
                <select value={contractType} onChange={(e) => setContractType(e.target.value as ContractType)} style={selectStyle}>
                  {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="empleado@empresa.com" />
              </FormField>
              <FormField label="DNI / NIE">
                <Input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="12345678A" />
              </FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <FormField label="Fecha de alta">
                <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
              </FormField>
              <FormField label="Fecha de baja">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </FormField>
              <FormField label="Estado">
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setActive(true)}
                    style={statePill(active)}
                  >Alta</button>
                  <button
                    type="button"
                    onClick={() => setActive(false)}
                    style={statePill(!active)}
                  >Baja</button>
                </div>
              </FormField>
            </div>
          </FormSection>

          {/* --- Nómina --- */}
          <FormSection title="Nómina mensual (€)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Bruto mensual">
                <Input
                  type="number" min="0" step="0.01"
                  value={grossMonth === 0 ? "" : grossMonth}
                  onChange={(e) => setGrossMonth(Number(e.target.value) || 0)}
                  placeholder="2500"
                />
              </FormField>
              <FormField label="Neto mensual">
                <Input
                  type="number" min="0" step="0.01"
                  value={netMonth === 0 ? "" : netMonth}
                  onChange={(e) => setNetMonth(Number(e.target.value) || 0)}
                  placeholder="1980"
                />
              </FormField>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <FormField label="IRPF retenido">
                <Input
                  type="number" min="0" step="0.01"
                  value={irpf === 0 ? "" : irpf}
                  onChange={(e) => setIrpf(Number(e.target.value) || 0)}
                  placeholder="350"
                />
              </FormField>
              <FormField label="SS patronal">
                <Input
                  type="number" min="0" step="0.01"
                  value={ssEmployer === 0 ? "" : ssEmployer}
                  onChange={(e) => setSsEmployer(Number(e.target.value) || 0)}
                  placeholder="760"
                />
              </FormField>
              <FormField label="SS trabajador">
                <Input
                  type="number" min="0" step="0.01"
                  value={ssEmployee === 0 ? "" : ssEmployee}
                  onChange={(e) => setSsEmployee(Number(e.target.value) || 0)}
                  placeholder="160"
                />
              </FormField>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", padding: "6px 0" }}>
              Los importes se usan para calcular los totales del módulo de Nóminas. Más adelante podrán generarse los recibos y el modelo 111 desde aquí.
            </div>
          </FormSection>

          {/* --- Notas --- */}
          <FormSection title="Notas">
            <FormField label="Comentarios internos">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pluses, observaciones, condiciones especiales…"
                style={{
                  width: "100%", minHeight: 60, padding: "8px 10px",
                  border: "1px solid var(--border)", borderRadius: 8,
                  fontSize: 13, fontFamily: "inherit", background: "var(--surface)",
                  resize: "vertical",
                }}
              />
            </FormField>
          </FormSection>

          {err && (
            <div style={{ fontSize: 12.5, color: "var(--error)", background: "#F5E1E1", padding: "8px 12px", borderRadius: 8 }}>
              {err}
            </div>
          )}
        </div>

        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid var(--border)",
          background: "var(--beige-bg)",
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear empleado"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Helpers UI ----
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        paddingBottom: 6, borderBottom: "1px solid var(--border)",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const selectStyle: React.CSSProperties = {
  height: 34, width: "100%", padding: "0 10px",
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--surface)", outline: "none", fontSize: 13.5,
};

const statePill = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
  border: "1px solid var(--border)",
  background: active ? "var(--black)" : "var(--surface)",
  color: active ? "#fff" : "var(--text)",
});
