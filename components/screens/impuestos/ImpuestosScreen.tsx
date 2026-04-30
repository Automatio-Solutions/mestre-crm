"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Icon, Button, Card, Badge, Input, Modal, Dropdown, DropdownItem, DropdownSeparator, EmptyState, useConfirm,
} from "@/components/ui";
import { Th, Td } from "@/components/screens/contactos";
import { useTaxModels } from "@/lib/db/useTaxModels";
import { useInvoices } from "@/lib/db/useInvoices";
import { usePurchases } from "@/lib/db/usePurchases";
import type { TaxModel, NewTaxModel, TaxStatus } from "@/lib/db/taxModels";
import {
  calc303Quarterly,
  calcTaxSummary,
  availableYears,
  isQuarterlyIvaModel,
  QUARTER_LABELS,
} from "@/lib/tax/calculations";
import { fmtEur, fmtAmount, fmtPercent } from "@/lib/format";
import * as D from "@/lib/data";

const statusTone: Record<string, any> = {
  pendiente: "warning",
  presentado: "success",
  aplazado: "outline",
};

// ============================================================
// Pantalla principal
// ============================================================

export function ImpuestosScreen() {
  const { taxModels, loading: loadingModels } = useTaxModels();
  const { invoices, loading: loadingInv } = useInvoices();
  const { purchases, loading: loadingPur } = usePurchases();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  // Modelos pendientes ordenados por fecha de vencimiento (asc)
  const upcoming = useMemo(
    () => [...taxModels]
      .filter((t) => t.status === "pendiente")
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
    [taxModels]
  );

  // Selección por defecto: primer modelo pendiente, o primero a secas
  useEffect(() => {
    if (selectedId) return;
    if (upcoming.length > 0) setSelectedId(upcoming[0].id);
    else if (taxModels.length > 0) setSelectedId(taxModels[0].id);
  }, [selectedId, upcoming, taxModels]);

  const selected = taxModels.find((t) => t.id === selectedId) || null;

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      {/* ===== Header ===== */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
            Impuestos
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>
            Modelos trimestrales y anuales (303, 130, 111, 190…)
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="primary"
            leftIcon={<Icon name="settings" size={14} />}
            onClick={() => setConfigOpen(true)}
          >
            Configurar modelos
          </Button>
        </div>
      </div>

      {/* ===== Layout dos columnas ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, alignItems: "start" }}>
        <UpcomingPanel
          loading={loadingModels}
          models={upcoming}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ModelDetailCard
            model={selected}
            invoices={invoices}
            purchases={purchases}
            loading={loadingModels || loadingInv || loadingPur}
          />
          <TaxSummaryCard
            invoices={invoices}
            purchases={purchases}
            loading={loadingInv || loadingPur}
          />
        </div>
      </div>

      {/* ===== Modal de configuración / CRUD ===== */}
      <ConfigurarModelosModal open={configOpen} onClose={() => setConfigOpen(false)} />
    </div>
  );
}

// ============================================================
// Panel izquierdo — Próximos impuestos
// ============================================================

function UpcomingPanel({
  loading, models, selectedId, onSelect,
}: {
  loading: boolean;
  models: TaxModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  // Agrupar por fecha de vencimiento (DD MES en mayúsculas)
  const groups = useMemo(() => {
    const m = new Map<string, { dateKey: number; label: string; items: TaxModel[] }>();
    models.forEach((t) => {
      const key = t.dueDate.toISOString().slice(0, 10);
      if (!m.has(key)) {
        m.set(key, {
          dateKey: t.dueDate.getTime(),
          label: t.dueDate
            .toLocaleDateString("es-ES", { day: "numeric", month: "long" })
            .toUpperCase(),
          items: [],
        });
      }
      m.get(key)!.items.push(t);
    });
    return Array.from(m.values()).sort((a, b) => a.dateKey - b.dateKey);
  }, [models]);

  return (
    <Card padding={0} style={{ overflow: "hidden", position: "sticky", top: 88 }}>
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Próximos impuestos</div>
        <Icon name="list" size={14} style={{ color: "var(--text-faint)" }} />
      </div>

      {loading && (
        <div style={{ padding: 24, fontSize: 13, color: "var(--text-muted)" }}>Cargando…</div>
      )}

      {!loading && groups.length === 0 && (
        <div style={{ padding: 24 }}>
          <EmptyState
            icon={<Icon name="check" size={24} />}
            title="Sin pendientes"
            description="No tienes modelos fiscales por presentar."
          />
        </div>
      )}

      {!loading && groups.map((g) => (
        <div key={g.dateKey}>
          <div style={{
            padding: "10px 16px",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.06em",
            color: "var(--text-muted)",
            background: "var(--beige-bg)",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
          }}>
            {g.label}
          </div>

          {g.items.map((t) => {
            const active = t.id === selectedId;
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: active ? "var(--beige-bg)" : "transparent",
                  borderTop: "1px solid var(--border)",
                  borderLeft: active ? "3px solid var(--purple)" : "3px solid transparent",
                  cursor: "pointer",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--beige-bg)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{
                  width: 44, minWidth: 44, height: 44, borderRadius: 8,
                  background: "var(--beige)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  fontWeight: 500,
                }}>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", lineHeight: 1 }}>
                    Modelo
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                    {t.code}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {t.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {t.period}
                    </span>
                    <Badge tone={statusTone[t.status]}>{t.status}</Badge>
                  </div>
                </div>
                <Icon name="chevronRight" size={14} style={{ color: "var(--text-faint)" }} />
              </button>
            );
          })}
        </div>
      ))}
    </Card>
  );
}

// ============================================================
// Detalle del modelo seleccionado
// ============================================================

function ModelDetailCard({
  model, invoices, purchases, loading,
}: {
  model: TaxModel | null;
  invoices: ReturnType<typeof useInvoices>["invoices"];
  purchases: ReturnType<typeof usePurchases>["purchases"];
  loading: boolean;
}) {
  const years = useMemo(() => availableYears(invoices, purchases), [invoices, purchases]);
  const [year, setYear] = useState<number>(() => new Date().getFullYear());

  // Reseleccionar el año si cambia el modelo: el del modelo si lo tiene
  useEffect(() => {
    if (!model) return;
    const y = model.dueDate.getFullYear();
    if (y && years.includes(y)) setYear(y);
  }, [model, years]);

  if (!model) {
    return (
      <Card padding={0} style={{ overflow: "hidden" }}>
        <div style={{ padding: 40 }}>
          <EmptyState
            icon={<Icon name="landmark" size={28} />}
            title="Selecciona un modelo"
            description="Escoge un modelo del panel izquierdo para ver su desglose."
          />
        </div>
      </Card>
    );
  }

  const showsQuarterly = isQuarterlyIvaModel(model.code);

  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      {/* Cabecera */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            padding: "3px 8px", borderRadius: 6, background: "var(--beige)",
            fontSize: 11, fontWeight: 600,
          }}>
            {model.code}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {model.name}
          </div>
        </div>
        <YearSelector year={year} years={years} onChange={setYear} />
      </div>

      {showsQuarterly ? (
        <Quarterly303Table invoices={invoices} purchases={purchases} year={year} model={model} />
      ) : (
        <SingleModelView model={model} />
      )}
    </Card>
  );
}

// --- Tabla trimestral 303 ---

function Quarterly303Table({
  invoices, purchases, year, model,
}: {
  invoices: ReturnType<typeof useInvoices>["invoices"];
  purchases: ReturnType<typeof usePurchases>["purchases"];
  year: number;
  model: TaxModel;
}) {
  const rows = useMemo(
    () => calc303Quarterly(invoices, purchases, year),
    [invoices, purchases, year]
  );

  const total = rows.reduce(
    (acc, r) => ({
      ivaSoportado: acc.ivaSoportado + r.ivaSoportado,
      ivaRepercutido: acc.ivaRepercutido + r.ivaRepercutido,
      resultado: acc.resultado + r.resultado,
    }),
    { ivaSoportado: 0, ivaRepercutido: 0, resultado: 0 }
  );

  return (
    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
      <thead>
        <tr style={{ background: "var(--beige-bg)" }}>
          <Th>Período</Th>
          <Th align="right">IVA soportado</Th>
          <Th align="right">IVA repercutido</Th>
          <Th align="right">Resultado IVA</Th>
          <Th>Estado</Th>
          <Th style={{ width: 80 }} />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const showZero = r.ivaSoportado === 0 && r.ivaRepercutido === 0;
          return (
            <tr key={r.quarter} style={{ borderTop: "1px solid var(--border)" }}>
              <Td>{QUARTER_LABELS[r.quarter]}</Td>
              <Td align="right" mono muted={r.ivaSoportado === 0}>
                {r.ivaSoportado === 0 ? "0" : fmtEur(r.ivaSoportado)}
              </Td>
              <Td align="right" mono muted={r.ivaRepercutido === 0}>
                {r.ivaRepercutido === 0 ? "0" : (
                  <span style={{ color: "var(--purple)" }}>{fmtEur(r.ivaRepercutido)}</span>
                )}
              </Td>
              <Td align="right" mono muted={r.resultado === 0} style={{ fontWeight: 500 }}>
                {r.resultado === 0 ? "0" : fmtEur(r.resultado)}
              </Td>
              <Td>
                {showZero ? (
                  <span style={{ fontSize: 12, color: "var(--text-faint)" }}>—</span>
                ) : (
                  <Badge tone={statusTone[model.status]}>{model.status}</Badge>
                )}
              </Td>
              <Td>
                {!showZero && (
                  <button style={{
                    fontSize: 12, color: "var(--purple)", fontWeight: 500,
                    display: "inline-flex", alignItems: "center", gap: 2,
                  }}>
                    Ver <Icon name="chevronRight" size={12} />
                  </button>
                )}
              </Td>
            </tr>
          );
        })}
        <tr style={{ borderTop: "1px solid var(--border)", background: "var(--beige-bg)" }}>
          <Td><b style={{ fontWeight: 600 }}>Total</b></Td>
          <Td align="right" mono muted={total.ivaSoportado === 0}>
            {total.ivaSoportado === 0 ? "0" : fmtEur(total.ivaSoportado)}
          </Td>
          <Td align="right" mono muted={total.ivaRepercutido === 0} style={{ fontWeight: 500 }}>
            {total.ivaRepercutido === 0 ? "0" : fmtEur(total.ivaRepercutido)}
          </Td>
          <Td align="right" mono style={{ fontWeight: 600 }}>
            {total.resultado === 0 ? "0" : fmtEur(total.resultado)}
          </Td>
          <Td />
          <Td />
        </tr>
      </tbody>
    </table>
  );
}

// --- Vista para modelos no trimestrales ---

function SingleModelView({ model }: { model: TaxModel }) {
  const daysLeft = Math.round((model.dueDate.getTime() - D.TODAY.getTime()) / 86400000);
  const overdue = model.status === "pendiente" && daysLeft < 0;

  return (
    <div style={{ padding: 20 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 16,
      }}>
        <Field label="Período" value={model.period} />
        <Field
          label="Vencimiento"
          value={
            <span style={{ color: overdue ? "var(--error)" : "var(--text)" }}>
              {D.fmtShort(model.dueDate)}
              {model.status === "pendiente" && (
                <span style={{ marginLeft: 8, fontSize: 12, color: overdue ? "var(--error)" : "var(--text-muted)" }}>
                  {overdue ? `Vencido hace ${Math.abs(daysLeft)}d`
                    : daysLeft === 0 ? "Hoy"
                    : `en ${daysLeft}d`}
                </span>
              )}
            </span>
          }
        />
        <Field label="Importe" value={fmtEur(model.amount)} />
        <Field label="Estado" value={<Badge tone={statusTone[model.status]}>{model.status}</Badge>} />
        {model.description && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Descripción" value={model.description} />
          </div>
        )}
        {model.notes && (
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Notas" value={model.notes} />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5 }}>{value}</div>
    </div>
  );
}

// ============================================================
// Resumen de impuestos
// ============================================================

function TaxSummaryCard({
  invoices, purchases, loading,
}: {
  invoices: ReturnType<typeof useInvoices>["invoices"];
  purchases: ReturnType<typeof usePurchases>["purchases"];
  loading: boolean;
}) {
  const years = useMemo(() => availableYears(invoices, purchases), [invoices, purchases]);
  const [year, setYear] = useState<number>(() => new Date().getFullYear());

  const summary = useMemo(
    () => calcTaxSummary(invoices, purchases, year),
    [invoices, purchases, year]
  );

  const isCurrent = year === new Date().getFullYear();

  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Resumen de impuestos</div>
        <YearSelector
          year={year}
          years={years}
          onChange={setYear}
          currentLabel={isCurrent ? "Año actual" : undefined}
        />
      </div>

      {loading && <div style={{ padding: 24, fontSize: 13, color: "var(--text-muted)" }}>Cargando…</div>}

      {!loading && (
        <>
          <SummarySection title="Ventas" rows={summary.ventas} />
          <SummarySection title="Compras" rows={summary.compras} />
        </>
      )}
    </Card>
  );
}

function SummarySection({ title, rows }: { title: string; rows: { vatPct: number; base: number; importe: number }[] }) {
  return (
    <div>
      <div style={{
        padding: "12px 16px 6px",
        fontSize: 13, fontWeight: 500,
      }}>
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--beige-bg)" }}>
            <Th />
            <Th align="right">Subtotal</Th>
            <Th align="right">Importe</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr style={{ borderTop: "1px solid var(--border)" }}>
              <td colSpan={3} style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-faint)" }}>
                No hay datos disponibles
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.vatPct} style={{ borderTop: "1px solid var(--border)" }}>
                <Td>IVA {fmtPercent(r.vatPct)}</Td>
                <Td align="right" mono>{fmtAmount(r.base)} €</Td>
                <Td align="right" mono style={{ fontWeight: 500 }}>{fmtAmount(r.importe)} €</Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Selector de año (compartido)
// ============================================================

function YearSelector({
  year, years, onChange, currentLabel,
}: {
  year: number;
  years: number[];
  onChange: (y: number) => void;
  currentLabel?: string;
}) {
  return (
    <Dropdown
      align="end"
      trigger={
        <button style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 10px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 7, fontSize: 12.5, fontWeight: 500,
        }}>
          {currentLabel || year}
          <Icon name="chevronDown" size={12} />
        </button>
      }
    >
      {years.map((y) => (
        <DropdownItem key={y} onClick={() => onChange(y)}>
          {y}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

// ============================================================
// Modal de configuración (CRUD completo)
// ============================================================

function ConfigurarModelosModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const confirm = useConfirm();
  const { taxModels, loading, create, update, remove } = useTaxModels();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaxModel | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const filtered = statusFilter === "todos"
    ? taxModels
    : taxModels.filter((t) => t.status === statusFilter);

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
    <>
      <Modal open={open} onClose={onClose} width={1080}>
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, maxHeight: "92vh" }}>
          <div style={{
            padding: "20px 24px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Configurar modelos</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
                Añade, edita o elimina los modelos fiscales del calendario.
              </p>
            </div>
            <Button variant="primary" leftIcon={<Icon name="plus" size={14} />} onClick={openNew}>
              Nuevo modelo
            </Button>
          </div>

          {/* Filtros */}
          <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10 }}>
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

          {/* Tabla */}
          <div style={{ overflow: "auto", flex: 1 }}>
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
                      <Td align="right" mono style={{ fontWeight: 500 }}>{fmtEur(t.amount)}</Td>
                      <Td><Badge tone={statusTone[t.status]}>{t.status}</Badge></Td>
                      <Td muted>{t.presentedDate ? D.fmtShort(t.presentedDate) : "—"}</Td>
                      <Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
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
          </div>

          {/* Footer */}
          <div style={{
            padding: "12px 24px", borderTop: "1px solid var(--border)",
            background: "var(--beige-bg)",
            display: "flex", justifyContent: "flex-end",
          }}>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </Modal>

      <TaxFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initial={editing}
      />
    </>
  );
}

// ============================================================
// Modal nuevo / editar
// ============================================================

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
