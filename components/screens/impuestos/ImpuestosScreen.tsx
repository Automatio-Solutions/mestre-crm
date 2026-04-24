"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Icon, Button, Card, Badge, Input, Modal, Dropdown, DropdownItem, DropdownSeparator, EmptyState, useConfirm,
} from "@/components/ui";
import { Th, Td } from "@/components/screens/contactos";
import { StatCard } from "@/components/screens/ventas/shared";
import { useTaxModels } from "@/lib/db/useTaxModels";
import type { TaxModel, NewTaxModel, TaxStatus } from "@/lib/db/taxModels";
import * as D from "@/lib/data";

const statusTone: Record<string, any> = {
  pendiente: "warning",
  presentado: "success",
  aplazado: "outline",
};

export function ImpuestosScreen() {
  const confirm = useConfirm();
  const { taxModels, loading, create, update, remove } = useTaxModels();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaxModel | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const filtered = statusFilter === "todos"
    ? taxModels
    : taxModels.filter((t) => t.status === statusFilter);

  const totals = useMemo(() => ({
    pendiente: taxModels.filter((t) => t.status === "pendiente").reduce((s, t) => s + t.amount, 0),
    presentado: taxModels.filter((t) => t.status === "presentado").reduce((s, t) => s + t.amount, 0),
    vencen30: taxModels
      .filter((t) => t.status === "pendiente" && t.dueDate.getTime() - D.TODAY.getTime() < 30 * 86400000)
      .reduce((s, t) => s + t.amount, 0),
    total: taxModels.reduce((s, t) => s + t.amount, 0),
  }), [taxModels]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t: TaxModel) => { setEditing(t); setFormOpen(true); };

  const handleSubmit = async (values: NewTaxModel) => {
    if (editing) await update(editing.id, values);
    else await create(values);
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async (t: TaxModel) => {
    const ok = await confirm({
      title: "Eliminar modelo",
      message: `¿Seguro que quieres eliminar "${t.name}"?`,
      danger: true,
    });
    if (!ok) return;
    await remove(t.id);
  };

  const togglePresented = async (t: TaxModel) => {
    if (t.status === "presentado") {
      await update(t.id, { status: "pendiente", presentedDate: null });
    } else {
      await update(t.id, { status: "presentado", presentedDate: new Date() });
    }
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>Impuestos</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>
            Modelos trimestrales y anuales (303, 130, 111, 190…)
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" leftIcon={<Icon name="download" size={14} />}>Exportar</Button>
          <Button variant="primary" leftIcon={<Icon name="plus" size={14} />} onClick={openNew}>
            Nuevo modelo
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard
          label="Pendiente total"
          value={totals.pendiente}
          color="var(--warning)"
          sub={`${taxModels.filter((t) => t.status === "pendiente").length} modelos`}
        />
        <StatCard
          label="Vencen en 30 días"
          value={totals.vencen30}
          color="var(--error)"
          sub="A presentar pronto"
        />
        <StatCard
          label="Presentado YTD"
          value={totals.presentado}
          color="var(--success)"
          sub={`${taxModels.filter((t) => t.status === "presentado").length} presentaciones`}
        />
        <StatCard label="Total registrado" value={totals.total} sub="Histórico" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
          {[
            { id: "todos", label: "Todos" },
            { id: "pendiente", label: "Pendientes" },
            { id: "presentado", label: "Presentados" },
            { id: "aplazado", label: "Aplazados" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: statusFilter === s.id ? "var(--surface)" : "transparent",
                color: statusFilter === s.id ? "var(--text)" : "var(--text-muted)",
                boxShadow: statusFilter === s.id ? "var(--shadow-sm)" : "none",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Card padding={0} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--beige-bg)" }}>
              <Th style={{ width: 60 }}>Código</Th>
              <Th>Modelo</Th>
              <Th>Descripción</Th>
              <Th>Periodo</Th>
              <Th>Vencimiento</Th>
              <Th align="right">Importe</Th>
              <Th>Estado</Th>
              <Th>Presentado</Th>
              <Th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Cargando…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9}>
                <EmptyState
                  icon={<Icon name="landmark" size={28} />}
                  title={taxModels.length === 0 ? "Sin modelos todavía" : "Sin resultados"}
                  description={taxModels.length === 0 ? "Añade un modelo (303, 130, 111…) con el botón de arriba." : "Prueba con otro filtro."}
                  action={
                    taxModels.length === 0 && (
                      <Button variant="primary" leftIcon={<Icon name="plus" size={14} />} onClick={openNew}>
                        Nuevo modelo
                      </Button>
                    )
                  }
                />
              </td></tr>
            )}
            {!loading && filtered.map((t) => {
              const daysLeft = Math.round((t.dueDate.getTime() - D.TODAY.getTime()) / 86400000);
              const overdue = t.status === "pendiente" && daysLeft < 0;
              return (
                <tr
                  key={t.id}
                  onClick={() => openEdit(t)}
                  style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Td>
                    <div style={{
                      width: 34, height: 34, borderRadius: 7,
                      background: "var(--beige)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 600, fontSize: 12,
                    }}>
                      {t.code}
                    </div>
                  </Td>
                  <Td><b style={{ fontWeight: 500 }}>{t.name}</b></Td>
                  <Td muted>{t.description || "—"}</Td>
                  <Td>{t.period}</Td>
                  <Td>
                    <span style={{ color: overdue ? "var(--error)" : "var(--text)" }}>
                      {D.fmtShort(t.dueDate)}
                    </span>
                    {t.status === "pendiente" && (
                      <span style={{
                        display: "block", fontSize: 11,
                        color: overdue ? "var(--error)" : daysLeft <= 7 ? "var(--warning)" : "var(--text-muted)",
                      }}>
                        {overdue ? `Vencido hace ${Math.abs(daysLeft)}d` : daysLeft === 0 ? "Hoy" : `en ${daysLeft}d`}
                      </span>
                    )}
                  </Td>
                  <Td align="right" mono style={{ fontWeight: 500 }}>
                    {t.amount.toLocaleString("es-ES", { useGrouping: "always", style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Td>
                  <Td><Badge tone={statusTone[t.status]}>{t.status}</Badge></Td>
                  <Td muted>{t.presentedDate ? D.fmtShort(t.presentedDate) : "—"}</Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      align="end"
                      trigger={
                        <button style={{ color: "var(--text-faint)", padding: 4, borderRadius: 4 }}>
                          <Icon name="moreV" size={14} />
                        </button>
                      }
                    >
                      <DropdownItem
                        leftIcon={<Icon name={t.status === "presentado" ? "clock" : "check"} size={13} />}
                        onClick={() => togglePresented(t)}
                      >
                        {t.status === "presentado" ? "Marcar pendiente" : "Marcar presentado"}
                      </DropdownItem>
                      <DropdownItem leftIcon={<Icon name="edit" size={13} />} onClick={() => openEdit(t)}>
                        Editar
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem danger leftIcon={<Icon name="trash" size={13} />} onClick={() => handleDelete(t)}>
                        Eliminar
                      </DropdownItem>
                    </Dropdown>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <TaxFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initial={editing}
      />
    </div>
  );
}

// ===== Modal nuevo / editar =====

const emptyForm: NewTaxModel & { presentedDateStr: string; dueDateStr: string } = {
  code: "",
  name: "",
  description: "",
  period: "",
  dueDate: new Date(),
  amount: 0,
  status: "pendiente",
  presentedDate: null,
  notes: "",
  presentedDateStr: "",
  dueDateStr: new Date().toISOString().slice(0, 10),
};

function TaxFormModal({
  open, onClose, onSubmit, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NewTaxModel) => Promise<void>;
  initial: TaxModel | null;
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        code: initial.code,
        name: initial.name,
        description: initial.description || "",
        period: initial.period,
        dueDate: initial.dueDate,
        amount: initial.amount,
        status: initial.status,
        presentedDate: initial.presentedDate,
        notes: initial.notes || "",
        dueDateStr: initial.dueDate.toISOString().slice(0, 10),
        presentedDateStr: initial.presentedDate ? initial.presentedDate.toISOString().slice(0, 10) : "",
      });
    } else {
      setForm(emptyForm);
    }
    setErr(null);
  }, [open, initial]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return setErr("El código es obligatorio.");
    if (!form.name.trim()) return setErr("El nombre es obligatorio.");
    if (!form.period.trim()) return setErr("El periodo es obligatorio.");
    if (!form.dueDateStr) return setErr("La fecha de vencimiento es obligatoria.");
    setSaving(true);
    setErr(null);
    try {
      await onSubmit({
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description || null,
        period: form.period.trim(),
        dueDate: new Date(form.dueDateStr),
        amount: Number(form.amount) || 0,
        status: form.status,
        presentedDate: form.presentedDateStr ? new Date(form.presentedDateStr) : null,
        notes: form.notes || null,
      });
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={560}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {initial ? "Editar modelo" : "Nuevo modelo fiscal"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            Añade modelos como 303 (IVA), 130 (IRPF), 111 (retenciones)…
          </p>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14 }}>
            <FormField label="Código *">
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="303" autoFocus />
            </FormField>
            <FormField label="Nombre *">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Modelo 303" />
            </FormField>
          </div>

          <FormField label="Descripción">
            <Input value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="IVA trimestral" />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Periodo *">
              <Input value={form.period} onChange={(e) => set("period", e.target.value)} placeholder="Q1 2026" />
            </FormField>
            <FormField label="Vencimiento *">
              <Input type="date" value={form.dueDateStr} onChange={(e) => set("dueDateStr", e.target.value)} />
            </FormField>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Importe (€)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount === 0 ? "" : form.amount}
                onChange={(e) => set("amount", Number(e.target.value) || 0)}
                placeholder="0"
              />
            </FormField>
            <FormField label="Estado">
              <div style={{ display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3, borderRadius: 7, border: "1px solid var(--border)" }}>
                {(["pendiente", "presentado", "aplazado"] as TaxStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status", s)}
                    style={{
                      flex: 1, padding: "5px 8px", borderRadius: 5, fontSize: 12, fontWeight: 500,
                      background: form.status === s ? "var(--surface)" : "transparent",
                      color: form.status === s ? "var(--text)" : "var(--text-muted)",
                      textTransform: "capitalize",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </FormField>
          </div>

          {form.status === "presentado" && (
            <FormField label="Fecha de presentación">
              <Input type="date" value={form.presentedDateStr} onChange={(e) => set("presentedDateStr", e.target.value)} />
            </FormField>
          )}

          {err && (
            <div style={{ fontSize: 12.5, color: "var(--error)", background: "#F5E1E1", padding: "8px 12px", borderRadius: 8 }}>
              {err}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border)",
            background: "var(--beige-bg)",
            display: "flex", justifyContent: "flex-end", gap: 8,
          }}
        >
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear modelo"}
          </Button>
        </div>
      </form>
    </Modal>
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
