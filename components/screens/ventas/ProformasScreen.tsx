"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Icon, Button, Card, Badge, Input, Modal,
  Dropdown, DropdownItem, DropdownSeparator, EmptyState, useConfirm,
} from "@/components/ui";
import { Th, Td } from "@/components/screens/contactos";
import { useContacts } from "@/lib/db/useContacts";
import { useProformas } from "@/lib/db/useProformas";
import type { Proforma, NewProforma, ProformaStatus } from "@/lib/db/proformas";
import { ContactAutocomplete } from "./ContactAutocomplete";
import { ConceptAutocomplete } from "./ConceptAutocomplete";
import { StatCard, VentasHeader } from "./shared";
import * as D from "@/lib/data";

const STATUSES: { id: ProformaStatus; label: string; tone: any; color: string }[] = [
  { id: "pendiente", label: "Pendiente", tone: "warning", color: "#C89B3C" },
  { id: "facturada", label: "Facturada", tone: "purple",  color: "#6A5ACD" },
  { id: "cobrada",   label: "Cobrada",   tone: "success", color: "#4A7C59" },
  { id: "vencida",   label: "Vencida",   tone: "error",   color: "#B84545" },
];

// ---- CSV helpers ----
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

export function ProformasScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { contacts } = useContacts();
  const { proformas, loading, create, update, remove, duplicate } = useProformas();

  const contactsMap = useMemo(() => {
    const m = new Map<string, any>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  // ---- Filtros ----
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [fClient, setFClient] = useState("");
  const [fIssueFrom, setFIssueFrom] = useState("");
  const [fIssueTo, setFIssueTo] = useState("");
  const [fAmountMin, setFAmountMin] = useState("");
  const [fAmountMax, setFAmountMax] = useState("");

  const activeFilterCount =
    (fClient ? 1 : 0) +
    (fIssueFrom || fIssueTo ? 1 : 0) +
    (fAmountMin || fAmountMax ? 1 : 0);

  const clearFilters = () => {
    setFClient(""); setFIssueFrom(""); setFIssueTo("");
    setFAmountMin(""); setFAmountMax("");
  };

  const filtered = useMemo(() => {
    let r = proformas;
    if (statusFilter !== "todos") r = r.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const lq = search.toLowerCase();
      r = r.filter((p) => ((p.number || "") + " " + (p.concept || "")).toLowerCase().includes(lq));
    }
    if (fClient) r = r.filter((p) => p.clientId === fClient);
    if (fIssueFrom) {
      const d = new Date(fIssueFrom);
      r = r.filter((p) => new Date(p.issueDate) >= d);
    }
    if (fIssueTo) {
      const d = new Date(fIssueTo);
      d.setHours(23, 59, 59, 999);
      r = r.filter((p) => new Date(p.issueDate) <= d);
    }
    const amin = fAmountMin === "" ? null : Number(fAmountMin);
    const amax = fAmountMax === "" ? null : Number(fAmountMax);
    if (amin !== null && !Number.isNaN(amin)) r = r.filter((p) => p.amount >= amin);
    if (amax !== null && !Number.isNaN(amax)) r = r.filter((p) => p.amount <= amax);
    return r;
  }, [proformas, statusFilter, search, fClient, fIssueFrom, fIssueTo, fAmountMin, fAmountMax]);

  const clientOptions = useMemo(() => {
    const ids = new Set(proformas.map((p) => p.clientId).filter(Boolean));
    return Array.from(ids)
      .map((id) => contactsMap.get(id as string))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [proformas, contactsMap]);

  // ---- Totales ----
  const totals = {
    pendientes: proformas.filter((p) => p.status === "pendiente").reduce((s, p) => s + p.amount, 0),
    cobradas:   proformas.filter((p) => p.status === "cobrada").reduce((s, p) => s + p.amount, 0),
    facturadas: proformas.filter((p) => p.status === "facturada").length,
  };

  // ---- Modal de formulario (crear/editar) ----
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Proforma | null>(null);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: Proforma) => { setEditing(p); setFormOpen(true); };

  const handleSubmit = async (values: NewProforma) => {
    if (editing) await update(editing.id, values);
    else await create(values);
    setFormOpen(false);
    setEditing(null);
  };

  // ---- Convertir a factura ----
  // Navegamos al flujo de "Nueva factura" pre-rellenado con los datos
  // de la proforma. Allí el usuario completa el resto de campos
  // (método de pago, cuenta contable, etc.) y al guardar marcamos la
  // proforma como "facturada" + enlazamos linkedInvoiceId.
  const handleConvertToInvoice = (p: Proforma) => {
    router.push(`/ventas/facturas/nueva?fromProforma=${p.id}`);
  };

  // ---- Eliminar ----
  const handleDelete = async (p: Proforma) => {
    const ok = await confirm({
      title: "Eliminar proforma",
      message: `¿Seguro que quieres eliminar la proforma ${p.number}? Esta acción no se puede deshacer.`,
      danger: true,
    });
    if (!ok) return;
    await remove(p.id);
  };

  // ---- Export ----
  const exportCSV = () => {
    const headers = ["Número", "Cliente", "Concepto", "Emisión", "Válida hasta", "Importe (€)", "IVA %", "Estado"];
    const rows = filtered.map((p) => {
      const cli = contactsMap.get(p.clientId || "");
      return [
        p.number,
        cli?.name || "",
        p.concept || "",
        csvDate(p.issueDate),
        csvDate(p.validUntil),
        p.amount,
        p.vatPct,
        p.status,
      ];
    });
    downloadCSV(`proformas_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <VentasHeader
        section="Proformas"
        title="Proformas"
        description="Facturas de anticipo no fiscales"
        primary={{ label: "Nueva proforma", icon: "plus", onClick: openNew }}
        onExport={exportCSV}
        exportDisabled={filtered.length === 0}
      />

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard label="Pendientes" value={totals.pendientes} color="var(--warning)" />
        <StatCard label="Cobradas" value={totals.cobradas} color="var(--success)" sub="Anticipos recibidos" />
        <StatCard label="Convertidas a factura" value={totals.facturadas} format="number" suffix=" docs" sub="Ya facturadas" />
      </div>

      {/* Aviso informativo */}
      <Card padding={14} style={{ marginBottom: 16, background: "var(--purple-soft)", border: "1px solid #D4CEEE" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="alert" size={16} style={{ color: "var(--purple)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: "var(--text)" }}>
            <b>Las proformas no son documentos fiscales.</b> Úsalas como presupuesto con formato de factura o para cobrar anticipos. Cuando el cliente paga, conviértela en factura real para que cuente a efectos de IVA.
          </div>
        </div>
      </Card>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar número, concepto…"
            leftIcon={<Icon name="search" size={14} />}
          />
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--border)", flexWrap: "wrap" }}>
          {[{ id: "todos", label: "Todos" }, ...STATUSES.map((s) => ({ id: s.id, label: s.label }))].map((s) => (
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
        <Button
          variant={showFilters || activeFilterCount > 0 ? "primary" : "ghost"}
          size="sm"
          leftIcon={<Icon name="filter" size={13} />}
          onClick={() => setShowFilters((v) => !v)}
        >
          Más filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <Card padding={16} style={{ marginBottom: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              Filtros avanzados
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>Limpiar todo</Button>
              )}
              <Button variant="ghost" size="iconSm" onClick={() => setShowFilters(false)} title="Cerrar">
                <Icon name="close" size={13} />
              </Button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <FilterField label="Cliente">
              <select value={fClient} onChange={(e) => setFClient(e.target.value)} style={filterSelectStyle}>
                <option value="">Cualquiera</option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Fecha emisión (desde – hasta)">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Input type="date" value={fIssueFrom} onChange={(e) => setFIssueFrom(e.target.value)} />
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>–</span>
                <Input type="date" value={fIssueTo} onChange={(e) => setFIssueTo(e.target.value)} />
              </div>
            </FilterField>
            <FilterField label="Importe (€)">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Input type="number" value={fAmountMin} onChange={(e) => setFAmountMin(e.target.value)} placeholder="mín" />
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>–</span>
                <Input type="number" value={fAmountMax} onChange={(e) => setFAmountMax(e.target.value)} placeholder="máx" />
              </div>
            </FilterField>
          </div>
        </Card>
      )}

      {/* Tabla */}
      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Cargando proformas…
        </div>
      )}

      {!loading && proformas.length === 0 && (
        <EmptyState
          icon={<Icon name="fileText" size={28} />}
          title="Sin proformas todavía"
          description="Crea tu primera proforma para cobrar un anticipo o para enviar un presupuesto con formato de factura."
          action={
            <Button variant="primary" leftIcon={<Icon name="plus" size={14} />} onClick={openNew}>
              Nueva proforma
            </Button>
          }
        />
      )}

      {!loading && proformas.length > 0 && (
        <Card padding={0} style={{ overflow: "visible" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--beige-bg)" }}>
                <Th>Número</Th>
                <Th>Cliente</Th>
                <Th>Concepto</Th>
                <Th>Emisión</Th>
                <Th>Válida hasta</Th>
                <Th align="right">Importe</Th>
                <Th>Estado</Th>
                <Th>Origen / Destino</Th>
                <Th style={{ width: 110 }} />
                <Th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    Sin resultados. Prueba con otros filtros.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const cli = contactsMap.get(p.clientId || "");
                const st = STATUSES.find((s) => s.id === p.status);
                const canMarkPaid = p.status === "pendiente" || p.status === "vencida";
                const canConvert = p.status !== "facturada" && p.status !== "cobrada";
                return (
                  <tr
                    key={p.id}
                    onClick={() => openEdit(p)}
                    style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Td mono style={{ fontWeight: 500 }}>{p.number}</Td>
                    <Td>{cli?.name || "—"}</Td>
                    <Td muted>{p.concept || "—"}</Td>
                    <Td muted>{D.fmtShort(p.issueDate)}</Td>
                    <Td muted>{p.validUntil ? D.fmtShort(p.validUntil) : "—"}</Td>
                    <Td align="right" mono style={{ fontWeight: 500 }}>
                      {p.amount.toLocaleString("es-ES", { useGrouping: "always" as any })} €
                    </Td>
                    <Td>
                      <Badge tone={st?.tone}>{st?.label || p.status}</Badge>
                    </Td>
                    <Td>
                      {p.linkedQuoteId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/ventas/presupuestos/${p.linkedQuoteId}`); }}
                          style={{ fontSize: 11.5, color: "var(--purple)" }}
                        >
                          ← presupuesto
                        </button>
                      )}
                      {p.linkedInvoiceId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/ventas/facturas/${p.linkedInvoiceId}`); }}
                          style={{ fontSize: 11.5, color: "var(--success)" }}
                        >
                          → factura
                        </button>
                      )}
                      {!p.linkedQuoteId && !p.linkedInvoiceId && (
                        <span style={{ color: "var(--text-faint)", fontSize: 11 }}>—</span>
                      )}
                    </Td>
                    <Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      {p.status === "pendiente" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Icon name="receipt" size={12} />}
                          onClick={() => handleConvertToInvoice(p)}
                        >
                          Convertir
                        </Button>
                      )}
                    </Td>
                    <Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Dropdown
                        align="end"
                        trigger={
                          <button
                            style={{ color: "var(--text-faint)", padding: 4, borderRadius: 4 }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            title="Acciones"
                          >
                            <Icon name="moreV" size={14} />
                          </button>
                        }
                      >
                        <DropdownItem leftIcon={<Icon name="edit" size={13} />} onClick={() => openEdit(p)}>
                          Editar
                        </DropdownItem>
                        <DropdownItem
                          leftIcon={<Icon name="fileText" size={13} />}
                          onClick={async () => {
                            await duplicate(p.id);
                          }}
                        >
                          Duplicar
                        </DropdownItem>
                        {canMarkPaid && (
                          <DropdownItem
                            leftIcon={<Icon name="check" size={13} />}
                            onClick={() => update(p.id, { status: "cobrada" })}
                          >
                            Marcar cobrada
                          </DropdownItem>
                        )}
                        {canConvert && (
                          <DropdownItem
                            leftIcon={<Icon name="receipt" size={13} />}
                            onClick={() => handleConvertToInvoice(p)}
                          >
                            Convertir a factura
                          </DropdownItem>
                        )}
                        <DropdownSeparator />
                        <DropdownItem
                          danger
                          leftIcon={<Icon name="trash" size={13} />}
                          onClick={() => handleDelete(p)}
                        >
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
      )}

      <ProformaFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initial={editing}
      />
    </div>
  );
}

// ============================================================
// Modal Nueva / Editar proforma
// ============================================================
function ProformaFormModal({
  open, onClose, onSubmit, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NewProforma) => Promise<void>;
  initial: Proforma | null;
}) {
  const [clientId, setClientId] = useState("");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [vatPct, setVatPct] = useState<number>(21);
  const [status, setStatus] = useState<ProformaStatus>("pendiente");
  const [issueDate, setIssueDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setClientId(initial.clientId || "");
      setConcept(initial.concept || "");
      setAmount(initial.amount);
      setVatPct(initial.vatPct);
      setStatus(initial.status);
      setIssueDate(initial.issueDate ? initial.issueDate.toISOString().slice(0, 10) : "");
      setValidUntil(initial.validUntil ? initial.validUntil.toISOString().slice(0, 10) : "");
      setInternalNote(initial.internalNote || "");
    } else {
      setClientId("");
      setConcept("");
      setAmount(0);
      setVatPct(21);
      setStatus("pendiente");
      setIssueDate(new Date().toISOString().slice(0, 10));
      setValidUntil(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      setInternalNote("");
    }
    setErr(null);
  }, [open, initial]);

  const base = +(amount / (1 + (vatPct || 0) / 100)).toFixed(2);
  const vat = +(amount - base).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim()) return setErr("El concepto es obligatorio.");
    if (amount <= 0) return setErr("El importe debe ser mayor que 0.");
    setSaving(true);
    setErr(null);
    try {
      await onSubmit({
        clientId: clientId || null,
        concept: concept.trim(),
        amount: Number(amount) || 0,
        vatPct: Number(vatPct) || 0,
        status,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        internalNote: internalNote.trim() || null,
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
            {initial ? "Editar proforma" : "Nueva proforma"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            {initial ? "Actualiza los datos." : "Documento NO fiscal. Cuando el cliente pague, convierte la proforma en factura real."}
          </p>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
          <FormField label="Cliente">
            <ContactAutocomplete value={clientId} onChange={setClientId} />
          </FormField>

          <FormField label="Concepto *">
            <ConceptAutocomplete
              value={concept}
              onChange={setConcept}
              onSelectService={(s) => {
                setConcept(s.name);
                setVatPct(s.vat ?? 21);
                // amount = total con IVA = precio del servicio + IVA aplicado
                const newAmount = +((s.price || 0) * (1 + ((s.vat ?? 21) / 100))).toFixed(2);
                setAmount(newAmount);
              }}
              placeholder="Escribe el concepto o usa @ para buscar un servicio"
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 14 }}>
            <FormField label="Importe total (€, IVA incluido) *">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </FormField>
            <FormField label="IVA %">
              <select value={vatPct} onChange={(e) => setVatPct(Number(e.target.value))} style={selectStyle}>
                <option value={0}>0%</option>
                <option value={4}>4%</option>
                <option value={10}>10%</option>
                <option value={21}>21%</option>
              </select>
            </FormField>
          </div>

          {amount > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 12px", background: "var(--beige-bg)", borderRadius: 7 }}>
              Desglose: <b style={{ color: "var(--text)" }}>{base.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2 })} €</b> base
              {" + "}
              <b style={{ color: "var(--text)" }}>{vat.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2 })} €</b> IVA
              {" = "}
              <b style={{ color: "var(--text)" }}>{amount.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2 })} €</b> total
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Fecha emisión">
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </FormField>
            <FormField label="Válida hasta">
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </FormField>
          </div>

          <FormField label="Estado">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id)}
                  style={{
                    padding: "6px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
                    border: "1px solid var(--border)",
                    background: status === s.id ? "var(--black)" : "var(--surface)",
                    color: status === s.id ? "#fff" : "var(--text)",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Nota interna">
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Comentarios privados (no se muestran al cliente)"
              style={{
                width: "100%", minHeight: 60, padding: "8px 10px",
                border: "1px solid var(--border)", borderRadius: 8,
                fontSize: 13, fontFamily: "inherit", background: "var(--surface)",
                resize: "vertical",
              }}
            />
          </FormField>

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
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear proforma"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Helpers UI ----
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

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={{
        fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
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

const filterSelectStyle: React.CSSProperties = {
  height: 34, width: "100%", padding: "0 10px",
  border: "1px solid var(--border)", borderRadius: 7,
  background: "var(--surface)", outline: "none", fontSize: 13, fontFamily: "inherit",
};
