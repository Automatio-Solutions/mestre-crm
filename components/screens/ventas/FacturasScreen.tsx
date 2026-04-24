"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Icon, Button, Card, Badge, Input, EmptyState, Dropdown, DropdownItem, DropdownSeparator, Modal, useConfirm,
} from "@/components/ui";
import { Th, Td } from "@/components/screens/contactos";
import { useInvoices } from "@/lib/db/useInvoices";
import { useContacts } from "@/lib/db/useContacts";
import { useRecurringInvoices } from "@/lib/db/useRecurringInvoices";
import { usePaymentBatches } from "@/lib/db/usePaymentBatches";
import type { RecurringInvoice, NewRecurringInvoice, Frequency } from "@/lib/db/recurringInvoices";
import { ContactAutocomplete } from "./ContactAutocomplete";
import { StatCard, Toggle, VentasHeader } from "./shared";
import * as D from "@/lib/data";

type Tab = "facturas" | "recurrentes" | "remesas";

export function FacturasScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("facturas");
  // Hooks llamados UNA vez aquí; los sub-tabs reciben los datos como props
  const invoicesHook = useInvoices();
  const contactsHook = useContacts();
  const { invoices } = invoicesHook;

  const primaryByTab: Record<Tab, { label: string; icon: string; onClick: () => void }> = {
    facturas: { label: "Nueva factura", icon: "plus", onClick: () => router.push("/ventas/facturas/nueva") },
    recurrentes: { label: "Nueva recurrente", icon: "plus", onClick: () => {} },
    remesas: { label: "Generar remesa", icon: "bank", onClick: () => {} },
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <VentasHeader
        section="Facturas"
        title="Facturas"
        description="Facturas emitidas a clientes"
        primary={primaryByTab[tab]}
      />

      {/* Tabs internos */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        {([
          { id: "facturas", label: "Facturas", count: invoices.length, icon: "fileText" },
          { id: "recurrentes", label: "Recurrentes", count: D.RECURRING_INVOICES.length, icon: "refresh" },
          { id: "remesas", label: "Remesas SEPA", count: D.PAYMENT_BATCHES.length, icon: "bank" },
        ] as const).map((it) => {
          const active = it.id === tab;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px",
                borderBottom: active ? "2px solid var(--text)" : "2px solid transparent",
                marginBottom: -1,
                fontSize: 13, fontWeight: active ? 500 : 450,
                color: active ? "var(--text)" : "var(--text-muted)",
                whiteSpace: "nowrap", cursor: "pointer",
              }}
            >
              <Icon name={it.icon} size={14} />
              <span>{it.label}</span>
              {it.count > 0 && (
                <span style={{
                  fontSize: 11, padding: "1px 6px", borderRadius: 10,
                  background: active ? "var(--beige)" : "var(--beige-bg)",
                  color: "var(--text-muted)", fontWeight: 500,
                }}>
                  {it.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "facturas" && <FacturasTab invoicesHook={invoicesHook} contactsHook={contactsHook} />}
      {tab === "recurrentes" && <RecurrentesTab />}
      {tab === "remesas" && <RemesasTab invoicesHook={invoicesHook} contactsHook={contactsHook} />}
    </div>
  );
}

// ------------- Tab Facturas -------------
function FacturasTab({
  invoicesHook, contactsHook,
}: {
  invoicesHook: ReturnType<typeof useInvoices>;
  contactsHook: ReturnType<typeof useContacts>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { invoices, loading, update, remove, duplicate } = invoicesHook;
  const { contacts } = contactsHook;
  const contactsMap = useMemo(() => {
    const m = new Map<string, any>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const filtered = invoices.filter((i) => {
    if (statusFilter !== "todos" && i.status !== statusFilter) return false;
    if (search && !((i.number + " " + (i.concept || "")).toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const totals = {
    emitido: invoices.filter((i) => i.status !== "borrador").reduce((s, i) => s + i.total, 0),
    cobrado: invoices.filter((i) => i.status === "pagada").reduce((s, i) => s + i.total, 0),
    pendiente: invoices.filter((i) => i.status === "pendiente").reduce((s, i) => s + i.total, 0),
    vencido: invoices.filter((i) => i.status === "vencida").reduce((s, i) => s + i.total, 0),
  };

  const statusTone: Record<string, any> = {
    pagada: "success", pendiente: "warning", vencida: "error", borrador: "outline", enviada: "purple",
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard label="Emitido" value={totals.emitido} sub={`${invoices.length} facturas`} />
        <StatCard label="Cobrado" value={totals.cobrado} color="var(--success)" sub="este año" />
        <StatCard label="Pendiente" value={totals.pendiente} color="var(--warning)" sub={`${invoices.filter((i) => i.status === "pendiente").length} facturas`} />
        <StatCard label="Vencido" value={totals.vencido} color="var(--error)" sub={`${invoices.filter((i) => i.status === "vencida").length} facturas`} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar número, concepto…"
            leftIcon={<Icon name="search" size={14} />}
          />
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
          {[
            { id: "todos", label: "Todos" },
            { id: "borrador", label: "Borrador" },
            { id: "pendiente", label: "Pendientes" },
            { id: "pagada", label: "Pagadas" },
            { id: "vencida", label: "Vencidas" },
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
        <Button variant="ghost" size="sm" leftIcon={<Icon name="filter" size={13} />}>Más filtros</Button>
      </div>

      <Card padding={0} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--beige-bg)" }}>
              <Th>Número</Th>
              <Th>Cliente</Th>
              <Th>Concepto</Th>
              <Th>Emisión</Th>
              <Th>Vencimiento</Th>
              <Th align="right">Base</Th>
              <Th align="right">IVA</Th>
              <Th align="right">Total</Th>
              <Th>Estado</Th>
              <Th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Cargando facturas…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10}>
                <EmptyState
                  icon={<Icon name="fileText" size={28} />}
                  title={invoices.length === 0 ? "Sin facturas todavía" : "Sin resultados"}
                  description={invoices.length === 0 ? "Crea tu primera factura desde el botón de arriba." : "Prueba con otro filtro."}
                />
              </td></tr>
            )}
            {!loading && filtered.map((inv) => {
              const cli = contactsMap.get(inv.clientId as string);
              const handleDelete = async () => {
                const ok = await confirm({
                  title: "Eliminar factura",
                  message: `¿Seguro que quieres eliminar la factura ${inv.number}? Esta acción no se puede deshacer.`,
                  danger: true,
                });
                if (!ok) return;
                await remove(inv.id);
              };
              const handleDuplicate = async () => {
                const dup = await duplicate(inv.id);
                router.push(`/ventas/facturas/${dup.id}/editar`);
              };
              const canSend = inv.status === "borrador";
              const canMarkPaid = inv.status === "pendiente" || inv.status === "vencida" || inv.status === "enviada";
              return (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/ventas/facturas/${inv.id}`)}
                  style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Td mono><span style={{ fontWeight: 500 }}>{inv.number}</span></Td>
                  <Td>{cli?.name || "—"}</Td>
                  <Td muted>{inv.concept}</Td>
                  <Td muted>{D.fmtShort(inv.issueDate)}</Td>
                  <Td muted>{inv.dueDate ? D.fmtShort(inv.dueDate) : "—"}</Td>
                  <Td align="right" mono>{inv.base.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2 })} €</Td>
                  <Td align="right" mono muted>{(inv.total - inv.base).toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2 })} €</Td>
                  <Td align="right" mono><span style={{ fontWeight: 600 }}>{inv.total.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2 })} €</span></Td>
                  <Td><Badge tone={statusTone[inv.status]}>{inv.status}</Badge></Td>
                  <Td onClick={(e) => e.stopPropagation()}>
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
                      {canSend && (
                        <DropdownItem
                          leftIcon={<Icon name="mail" size={13} />}
                          onClick={() => update(inv.id, { status: "enviada" })}
                        >
                          Enviar
                        </DropdownItem>
                      )}
                      {canMarkPaid && (
                        <DropdownItem
                          leftIcon={<Icon name="check" size={13} />}
                          onClick={() => update(inv.id, { status: "pagada" })}
                        >
                          Marcar cobrada
                        </DropdownItem>
                      )}
                      <DropdownItem leftIcon={<Icon name="download" size={13} />}>Descargar</DropdownItem>
                      <DropdownItem
                        leftIcon={<Icon name="edit" size={13} />}
                        onClick={() => router.push(`/ventas/facturas/${inv.id}/editar`)}
                      >
                        Editar
                      </DropdownItem>
                      <DropdownItem
                        leftIcon={<Icon name="fileText" size={13} />}
                        onClick={handleDuplicate}
                      >
                        Duplicar
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem
                        leftIcon={<Icon name="trash" size={13} />}
                        onClick={handleDelete}
                        danger
                      >
                        Eliminar
                      </DropdownItem>
                    </Dropdown>
                  </Td>
                </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: "1.5px solid var(--border-strong)", background: "var(--beige-bg)" }}>
                <Td colSpan={5}><span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Totales ({filtered.length})</span></Td>
                <Td align="right" mono style={{ fontWeight: 600 }}>{filtered.reduce((s, i) => s + i.base, 0).toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2 })} €</Td>
                <Td align="right" mono style={{ fontWeight: 600 }}>{filtered.reduce((s, i) => s + (i.total - i.base), 0).toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2 })} €</Td>
                <Td align="right" mono style={{ fontWeight: 600 }}>{filtered.reduce((s, i) => s + i.total, 0).toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2 })} €</Td>
                <Td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </>
  );
}

// ------------- Tab Recurrentes (persistente en Supabase) -------------
function RecurrentesTab() {
  const confirm = useConfirm();
  const { recurring, loading, create, update, remove } = useRecurringInvoices();
  const { contacts } = useContacts();
  const contactsMap = useMemo(() => {
    const m = new Map<string, any>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringInvoice | null>(null);

  const total = recurring
    .filter((r) => r.active)
    .reduce((s, r) => s + (r.frequency === "Mensual" ? r.amount : r.amount / 12), 0);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: RecurringInvoice) => { setEditing(r); setFormOpen(true); };

  const handleSubmit = async (values: NewRecurringInvoice) => {
    if (editing) await update(editing.id, values);
    else await create(values);
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async (r: RecurringInvoice) => {
    const ok = await confirm({
      title: "Eliminar recurrente",
      message: `¿Seguro que quieres eliminar la recurrente "${r.concept || "(sin concepto)"}"?`,
      danger: true,
    });
    if (!ok) return;
    await remove(r.id);
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard label="MRR facturado" value={Math.round(total)} color="var(--success)" sub="Ingresos recurrentes mensuales" />
        <StatCard
          label="Activas"
          value={recurring.filter((r) => r.active).length}
          format="number"
          sub={`${recurring.length - recurring.filter((r) => r.active).length} pausadas`}
        />
        <StatCard label="ARR proyectado" value={Math.round(total * 12)} color="var(--purple)" sub="A 12 meses" />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button variant="primary" size="sm" leftIcon={<Icon name="plus" size={13} />} onClick={openNew}>
          Nueva recurrente
        </Button>
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Cargando recurrentes…
        </div>
      )}

      {!loading && recurring.length === 0 && (
        <EmptyState
          icon={<Icon name="refresh" size={28} />}
          title="Sin facturas recurrentes"
          description="Crea recurrentes para automatizar retainers, suscripciones o licencias."
          action={
            <Button variant="primary" leftIcon={<Icon name="plus" size={14} />} onClick={openNew}>
              Nueva recurrente
            </Button>
          }
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
        {!loading && recurring.map((r) => {
          const cli = contactsMap.get(r.clientId || "");
          return (
            <Card key={r.id} padding={18} interactive onClick={() => openEdit(r)} style={{ opacity: r.active ? 1 : 0.65 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Badge tone={r.frequency === "Anual" ? "purple" : "success"}>{r.frequency}</Badge>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => update(r.id, { active: !r.active })}
                    title={r.active ? "Pausar" : "Activar"}
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <Toggle checked={r.active} />
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {r.active ? "Activa" : "Pausada"}
                    </span>
                  </button>
                  <Dropdown
                    align="end"
                    trigger={
                      <button style={{ color: "var(--text-faint)", padding: 2, borderRadius: 4 }} title="Acciones">
                        <Icon name="moreV" size={13} />
                      </button>
                    }
                  >
                    <DropdownItem leftIcon={<Icon name="edit" size={13} />} onClick={() => openEdit(r)}>
                      Editar
                    </DropdownItem>
                    <DropdownItem
                      leftIcon={<Icon name={r.active ? "clock" : "check"} size={13} />}
                      onClick={() => update(r.id, { active: !r.active })}
                    >
                      {r.active ? "Pausar" : "Activar"}
                    </DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem danger leftIcon={<Icon name="trash" size={13} />} onClick={() => handleDelete(r)}>
                      Eliminar
                    </DropdownItem>
                  </Dropdown>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{cli?.name || "(Sin cliente)"}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>{r.concept || "—"}</div>
              <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.01em" }}>
                {r.amount.toLocaleString("es-ES", { useGrouping: "always" })} €
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)", marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="clock" size={11} />
                  {r.active && r.nextDate ? `Próxima ${D.fmtShort(r.nextDate)}` : "Sin próxima emisión"}
                </div>
                <div>{r.issuedCount} emitidas</div>
              </div>
            </Card>
          );
        })}
      </div>

      <RecurringFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initial={editing}
      />
    </>
  );
}

// Modal Nueva/Editar recurrente
function RecurringFormModal({
  open, onClose, onSubmit, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NewRecurringInvoice) => Promise<void>;
  initial: RecurringInvoice | null;
}) {
  const [clientId, setClientId] = useState("");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [frequency, setFrequency] = useState<Frequency>("Mensual");
  const [nextDate, setNextDate] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setClientId(initial.clientId || "");
      setConcept(initial.concept || "");
      setAmount(initial.amount);
      setFrequency(initial.frequency);
      setNextDate(initial.nextDate ? initial.nextDate.toISOString().slice(0, 10) : "");
      setActive(initial.active);
    } else {
      setClientId("");
      setConcept("");
      setAmount(0);
      setFrequency("Mensual");
      setNextDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      setActive(true);
    }
    setErr(null);
  }, [open, initial]);

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
        frequency,
        nextDate: nextDate ? new Date(nextDate) : null,
        active,
      });
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {initial ? "Editar recurrente" : "Nueva factura recurrente"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            Se emitirá una factura automáticamente según la frecuencia.
          </p>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
          <FormField label="Cliente">
            <ContactAutocomplete value={clientId} onChange={setClientId} />
          </FormField>

          <FormField label="Concepto *">
            <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej: Retainer mensual · estrategia" autoFocus />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Importe (€) *">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </FormField>
            <FormField label="Frecuencia">
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                style={selectStyle}
              >
                <option value="Mensual">Mensual</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Anual">Anual</option>
              </select>
            </FormField>
          </div>

          <FormField label="Próxima emisión">
            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </FormField>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Activa (se emitirá automáticamente en la fecha)</span>
          </label>

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
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear recurrente"}
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

const selectStyle: React.CSSProperties = {
  height: 34, width: "100%", padding: "0 10px",
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--surface)", outline: "none", fontSize: 13.5,
};

// ------------- Tab Remesas SEPA (persistente) -------------
function RemesasTab({
  invoicesHook, contactsHook,
}: {
  invoicesHook: ReturnType<typeof useInvoices>;
  contactsHook: ReturnType<typeof useContacts>;
}) {
  const confirm = useConfirm();
  const { invoices } = invoicesHook;
  const { contacts } = contactsHook;
  const { batches, loading, create: createBatch, remove: removeBatch, update: updateBatch } = usePaymentBatches();
  const contactsMap = useMemo(() => {
    const m = new Map<string, any>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  // Facturas ya incluidas en alguna remesa previa (para no duplicar)
  const invoicesInBatches = useMemo(() => {
    const s = new Set<string>();
    batches.forEach((b) => b.invoiceIds.forEach((id) => s.add(id)));
    return s;
  }, [batches]);

  const pending = invoices.filter((i) => i.status === "pendiente" && !invoicesInBatches.has(i.id));
  const selTotal = pending.filter((p) => selected.has(p.id)).reduce((s, p) => s + p.total, 0);

  const generateBatch = async () => {
    const ids = Array.from(selected);
    const total = pending.filter((p) => selected.has(p.id)).reduce((s, p) => s + p.total, 0);
    if (ids.length === 0) return;
    setGenerating(true);
    try {
      await createBatch({ invoiceIds: ids, total });
      setSelected(new Set());
    } catch (e) {
      console.error(e);
      alert("Error generando remesa");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard
          label="Pendientes de remesar"
          value={pending.reduce((s, p) => s + p.total, 0)}
          color="var(--warning)"
          sub={`${pending.length} facturas`}
        />
        <StatCard
          label="Cobrado por remesa YTD"
          value={batches.filter((b) => b.status === "cobrada").reduce((s, r) => s + r.total, 0)}
          color="var(--success)"
          sub={`${batches.filter((b) => b.status === "cobrada").length} remesas`}
        />
        <StatCard
          label="Total generadas"
          value={batches.length}
          format="number"
          sub="remesas"
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Remesas recientes
        </div>
        {loading && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando…</div>}
        {!loading && batches.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--text-faint)", padding: 16 }}>
            Aún no has generado ninguna remesa. Selecciona facturas pendientes abajo y clica "Generar remesa".
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          {!loading && batches.map((r) => (
            <Card key={r.id} padding={14}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.ref}</div>
                <Dropdown
                  align="end"
                  trigger={
                    <button style={{ color: "var(--text-faint)", padding: 2 }} title="Cambiar estado">
                      <Badge
                        tone={
                          r.status === "cobrada" ? "success"
                          : r.status === "devuelta" ? "error"
                          : r.status === "enviada" ? "purple"
                          : "warning"
                        }
                      >
                        {r.status}
                      </Badge>
                    </button>
                  }
                >
                  <DropdownItem onClick={() => updateBatch(r.id, { status: "generada" })}>Marcar generada</DropdownItem>
                  <DropdownItem onClick={() => updateBatch(r.id, { status: "enviada" })}>Marcar enviada</DropdownItem>
                  <DropdownItem onClick={() => updateBatch(r.id, { status: "cobrada" })}>Marcar cobrada</DropdownItem>
                  <DropdownItem onClick={() => updateBatch(r.id, { status: "devuelta" })}>Marcar devuelta</DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem
                    danger
                    leftIcon={<Icon name="trash" size={13} />}
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Eliminar remesa",
                        message: `¿Seguro que quieres eliminar la remesa ${r.ref}?`,
                        danger: true,
                      });
                      if (ok) await removeBatch(r.id);
                    }}
                  >
                    Eliminar
                  </DropdownItem>
                </Dropdown>
              </div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{r.total.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                {r.count} facturas · {D.fmtShort(r.date)}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{
          position: "sticky", top: 76, zIndex: 10,
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", marginBottom: 10,
          background: "var(--purple-soft)", borderRadius: 10, border: "1px solid #D4CEEE",
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--purple)" }}>
            {selected.size} facturas seleccionadas · {selTotal.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
          <div style={{ flex: 1 }} />
          <Button variant="outline" size="sm" leftIcon={<Icon name="download" size={13} />}>Descargar XML SEPA</Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon name="bank" size={13} />}
            onClick={generateBatch}
            disabled={generating}
          >
            {generating ? "Generando…" : "Generar remesa"}
          </Button>
        </div>
      )}

      <Card padding={0} style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 500 }}>
          Facturas pendientes de remesar
        </div>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--beige-bg)" }}>
              <Th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={selected.size === pending.length && pending.length > 0}
                  onChange={(e) => setSelected(e.target.checked ? new Set(pending.map((p) => p.id)) : new Set())}
                />
              </Th>
              <Th>Factura</Th>
              <Th>Cliente</Th>
              <Th>Concepto</Th>
              <Th>Vencimiento</Th>
              <Th align="right">Total</Th>
              <Th>IBAN cliente</Th>
              <Th>Mandato SEPA</Th>
            </tr>
          </thead>
          <tbody>
            {pending.map((inv) => {
              const cli = contactsMap.get(inv.clientId as string);
              const overdue = inv.dueDate && inv.dueDate < D.TODAY;
              return (
                <tr key={inv.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <Td>
                    <input
                      type="checkbox"
                      checked={selected.has(inv.id)}
                      onChange={() => {
                        const s = new Set(selected);
                        s.has(inv.id) ? s.delete(inv.id) : s.add(inv.id);
                        setSelected(s);
                      }}
                    />
                  </Td>
                  <Td mono style={{ fontWeight: 500 }}>{inv.number}</Td>
                  <Td>{cli?.name || "—"}</Td>
                  <Td muted>{inv.concept}</Td>
                  <Td>
                    <span style={{ color: overdue ? "var(--error)" : "var(--text-muted)" }}>
                      {inv.dueDate ? D.fmtShort(inv.dueDate) : "—"}
                    </span>
                  </Td>
                  <Td align="right" mono style={{ fontWeight: 500 }}>{inv.total.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Td>
                  <Td mono muted style={{ fontSize: 11 }}>ES•• •••• •••• ••••</Td>
                  <Td><Badge tone="success">firmado</Badge></Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
