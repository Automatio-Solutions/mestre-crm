"use client";
import { useMemo, useState, useEffect } from "react";
import {
  Icon, Button, Card, Badge, Input, Modal, Dropdown, DropdownItem, DropdownSeparator, EmptyState, useConfirm,
} from "@/components/ui";
import { Th, Td } from "@/components/screens/contactos";
import { useJournalEntries } from "@/lib/db/useJournalEntries";
import { useChartOfAccounts } from "@/lib/db/useChartOfAccounts";
import type { JournalEntry, NewJournalEntry, JournalLine } from "@/lib/db/journalEntries";
import { totalsOf } from "@/lib/db/journalEntries";
import * as D from "@/lib/data";

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

const fmtEur = (n: number) =>
  n.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function LibroDiarioScreen() {
  const confirm = useConfirm();
  const { entries, loading, create, update, remove } = useJournalEntries();
  const { accounts } = useChartOfAccounts();

  // Mapa de cuentas para mostrar nombres
  const accountMap = useMemo(() => {
    const m = new Map<string, string>();
    accounts.forEach((a) => m.set(a.code, a.name));
    return m;
  }, [accounts]);

  // Filtros
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);

  const filtered = useMemo(() => {
    let r = entries;
    if (search.trim()) {
      const lq = search.toLowerCase();
      r = r.filter((e) =>
        [
          e.number, e.description, e.docRef,
          ...e.lines.map((l) => l.concept || ""),
          ...e.lines.map((l) => l.accountCode),
        ].filter(Boolean).join(" ").toLowerCase().includes(lq)
      );
    }
    if (dateFrom) {
      const d = new Date(dateFrom);
      r = r.filter((e) => new Date(e.date) >= d);
    }
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      r = r.filter((e) => new Date(e.date) <= d);
    }
    if (accountFilter) {
      r = r.filter((e) => e.lines.some((l) => l.accountCode === accountFilter));
    }
    return r;
  }, [entries, search, dateFrom, dateTo, accountFilter]);

  // Sumas globales
  const totals = useMemo(() => {
    let debit = 0, credit = 0;
    filtered.forEach((e) => {
      e.lines.forEach((l) => { debit += l.debit; credit += l.credit; });
    });
    return { debit, credit };
  }, [filtered]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: JournalEntry) => { setEditing(e); setFormOpen(true); };

  const handleSubmit = async (values: NewJournalEntry) => {
    if (editing) await update(editing.id, values);
    else await create(values);
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async (e: JournalEntry) => {
    const ok = await confirm({
      title: "Eliminar asiento",
      message: `¿Seguro que quieres eliminar el asiento ${e.number}? Esta acción no se puede deshacer.`,
      danger: true,
    });
    if (!ok) return;
    await remove(e.id);
  };

  const exportCSV = () => {
    const headers = ["Nº asiento", "Fecha", "Doc.", "Concepto", "Cuenta", "Cuenta nombre", "Línea concepto", "Debe", "Haber"];
    const rows: any[][] = [];
    filtered.forEach((e) => {
      e.lines.forEach((l) => {
        rows.push([
          e.number, csvDate(e.date), e.docRef || "", e.description || "",
          l.accountCode, accountMap.get(l.accountCode) || "",
          l.concept || "", l.debit, l.credit,
        ]);
      });
    });
    downloadCSV(`libro_diario_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>Libro diario</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>
            Registro cronológico de asientos contables con partida doble (debe = haber).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="outline"
            leftIcon={<Icon name="download" size={14} />}
            onClick={exportCSV}
            disabled={filtered.length === 0}
          >
            Exportar
          </Button>
          <Button
            variant="primary"
            leftIcon={<Icon name="plus" size={14} />}
            onClick={openNew}
            disabled={accounts.length === 0}
            title={accounts.length === 0 ? "Configura primero el Cuadro de cuentas" : ""}
          >
            Nuevo asiento
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatStrip label="Asientos" value={`${filtered.length}`} sub={`${entries.length} totales`} />
        <StatStrip label="Total Debe" value={fmtEur(totals.debit)} color="var(--text)" />
        <StatStrip label="Total Haber" value={fmtEur(totals.credit)} color="var(--text)" />
        <StatStrip
          label="Diferencia"
          value={fmtEur(Math.abs(totals.debit - totals.credit))}
          color={Math.abs(totals.debit - totals.credit) < 0.01 ? "var(--success)" : "var(--error)"}
          sub={Math.abs(totals.debit - totals.credit) < 0.01 ? "Cuadrado ✓" : "Sin cuadrar"}
        />
      </div>

      {/* Toolbar de filtros */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, maxWidth: 300 }}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nº, concepto, cuenta…"
            leftIcon={<Icon name="search" size={14} />}
          />
        </div>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ maxWidth: 160 }} />
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>–</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ maxWidth: 160 }} />
        <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} style={{
          height: 34, padding: "0 10px",
          border: "1px solid var(--border)", borderRadius: 8,
          background: "var(--surface)", fontSize: 13, fontFamily: "inherit",
          maxWidth: 280, minWidth: 180,
        }}>
          <option value="">Todas las cuentas</option>
          {accounts.filter((a) => a.active).map((a) => (
            <option key={a.id} value={a.code}>{a.code} · {a.name}</option>
          ))}
        </select>
        {(search || dateFrom || dateTo || accountFilter) && (
          <Button variant="ghost" size="sm" onClick={() => {
            setSearch(""); setDateFrom(""); setDateTo(""); setAccountFilter("");
          }}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Lista de asientos */}
      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Cargando libro diario…
        </div>
      )}

      {!loading && entries.length === 0 && (
        <EmptyState
          icon={<Icon name="book" size={28} />}
          title="Sin asientos todavía"
          description="Crea tu primer asiento manualmente o ejecuta el seed con los movimientos del mock."
          action={
            <Button
              variant="primary"
              leftIcon={<Icon name="plus" size={14} />}
              onClick={openNew}
              disabled={accounts.length === 0}
            >
              Nuevo asiento
            </Button>
          }
        />
      )}

      {!loading && entries.length > 0 && (
        <Card padding={0} style={{ overflow: "visible" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--beige-bg)" }}>
                <Th>Nº asiento</Th>
                <Th>Fecha</Th>
                <Th>Cuenta</Th>
                <Th>Concepto</Th>
                <Th align="right">Debe</Th>
                <Th align="right">Haber</Th>
                <Th>Doc.</Th>
                <Th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    Sin resultados. Prueba con otros filtros.
                  </td>
                </tr>
              )}
              {filtered.map((e) => {
                const t = totalsOf(e.lines);
                return (
                  <EntryRows
                    key={e.id}
                    entry={e}
                    totals={t}
                    accountMap={accountMap}
                    onOpen={() => openEdit(e)}
                    onDelete={() => handleDelete(e)}
                  />
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: "1.5px solid var(--border-strong)", background: "var(--beige-bg)" }}>
                  <Td colSpan={4}>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Suma y saldo
                    </span>
                  </Td>
                  <Td align="right" mono style={{ fontWeight: 600 }}>{fmtEur(totals.debit)}</Td>
                  <Td align="right" mono style={{ fontWeight: 600 }}>{fmtEur(totals.credit)}</Td>
                  <Td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </Card>
      )}

      <EntryFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initial={editing}
        accountMap={accountMap}
        allAccounts={accounts.filter((a) => a.active)}
      />
    </div>
  );
}

// ============================================================
// Filas de un asiento (cabecera + N líneas)
// ============================================================
function EntryRows({
  entry, totals, accountMap, onOpen, onDelete,
}: {
  entry: JournalEntry;
  totals: { debit: number; credit: number; balanced: boolean };
  accountMap: Map<string, string>;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const lines = entry.lines.length > 0 ? entry.lines : [];

  return (
    <>
      {lines.map((l, i) => (
        <tr
          key={l.id || i}
          onClick={onOpen}
          style={{
            borderTop: i === 0 ? "1.5px solid var(--border-strong)" : "1px solid var(--border)",
            cursor: "pointer",
          }}
          onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--beige-bg)")}
          onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
        >
          <Td>
            {i === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 500, color: "var(--text)" }}>
                  {entry.number}
                </span>
                {!totals.balanced && (
                  <Badge tone="error">Descuadrado</Badge>
                )}
              </div>
            ) : <span style={{ color: "var(--text-faint)" }}>↳</span>}
          </Td>
          <Td muted>{i === 0 ? D.fmtShort(entry.date) : ""}</Td>
          <Td>
            <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--purple)", fontWeight: 500 }}>
              {l.accountCode}
            </span>{" "}
            <span style={{ color: "var(--text-muted)" }}>
              {accountMap.get(l.accountCode) || ""}
            </span>
          </Td>
          <Td>
            {i === 0 && entry.description ? (
              <div>
                <div style={{ fontWeight: 500 }}>{entry.description}</div>
                {l.concept && l.concept !== entry.description && (
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{l.concept}</div>
                )}
              </div>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>{l.concept || "—"}</span>
            )}
          </Td>
          <Td align="right" mono>
            {l.debit > 0 ? fmtEur(l.debit) : <span style={{ color: "var(--text-faint)" }}>—</span>}
          </Td>
          <Td align="right" mono>
            {l.credit > 0 ? fmtEur(l.credit) : <span style={{ color: "var(--text-faint)" }}>—</span>}
          </Td>
          <Td>
            {i === 0 && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{entry.docRef || "—"}</span>
            )}
          </Td>
          <Td onClick={(ev: React.MouseEvent) => ev.stopPropagation()}>
            {i === 0 && (
              <Dropdown
                align="end"
                trigger={
                  <button style={{ color: "var(--text-faint)", padding: 4, borderRadius: 4 }} title="Acciones">
                    <Icon name="moreV" size={14} />
                  </button>
                }
              >
                <DropdownItem leftIcon={<Icon name="edit" size={13} />} onClick={onOpen}>
                  Editar
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem danger leftIcon={<Icon name="trash" size={13} />} onClick={onDelete}>
                  Eliminar
                </DropdownItem>
              </Dropdown>
            )}
          </Td>
        </tr>
      ))}
    </>
  );
}

// ============================================================
// Modal Nuevo / Editar asiento
// ============================================================
type DraftLine = {
  accountCode: string;
  concept: string;
  debit: number;
  credit: number;
};

const emptyLine = (): DraftLine => ({ accountCode: "", concept: "", debit: 0, credit: 0 });

function EntryFormModal({
  open, onClose, onSubmit, initial, accountMap, allAccounts,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NewJournalEntry) => Promise<void>;
  initial: JournalEntry | null;
  accountMap: Map<string, string>;
  allAccounts: { code: string; name: string }[];
}) {
  const [number, setNumber] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [docRef, setDocRef] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setNumber(initial.number);
      setDate(initial.date.toISOString().slice(0, 10));
      setDescription(initial.description || "");
      setDocRef(initial.docRef || "");
      setLines(initial.lines.map((l) => ({
        accountCode: l.accountCode,
        concept: l.concept || "",
        debit: l.debit,
        credit: l.credit,
      })));
    } else {
      setNumber("");  // se autogenera al guardar
      setDate(new Date().toISOString().slice(0, 10));
      setDescription("");
      setDocRef("");
      setLines([emptyLine(), emptyLine()]);
    }
    setErr(null);
  }, [open, initial]);

  const totals = totalsOf(lines);

  const updateLine = (idx: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return setErr("La fecha es obligatoria.");
    if (lines.some((l) => !l.accountCode.trim())) return setErr("Todas las líneas necesitan código de cuenta.");
    if (!totals.balanced) return setErr(`El asiento no cuadra: Debe ${fmtEur(totals.debit)} ≠ Haber ${fmtEur(totals.credit)}.`);

    setSaving(true);
    setErr(null);
    try {
      await onSubmit({
        number: number.trim() || undefined,
        date: new Date(date),
        description: description.trim() || null,
        docRef: docRef.trim() || null,
        sourceType: "manual",
        lines: lines.map((l) => ({
          accountCode: l.accountCode.trim(),
          concept: l.concept || null,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      });
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={920}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {initial ? `Editar asiento ${initial.number}` : "Nuevo asiento"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            Cada asiento necesita al menos 2 líneas y la suma del Debe debe igualar la del Haber.
          </p>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
          {/* Cabecera */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 160px 1fr 200px", gap: 12 }}>
            <FormField label="Nº asiento">
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Auto" />
            </FormField>
            <FormField label="Fecha *">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField label="Concepto general">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Emisión factura 2026/043" />
            </FormField>
            <FormField label="Doc. referencia">
              <Input value={docRef} onChange={(e) => setDocRef(e.target.value)} placeholder="FV 2026/043" />
            </FormField>
          </div>

          {/* Líneas */}
          <div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 8,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Líneas del asiento
              </div>
              <Button type="button" variant="ghost" size="sm" leftIcon={<Icon name="plus" size={13} />} onClick={addLine}>
                Añadir línea
              </Button>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--surface)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "var(--beige-bg)" }}>
                    <th style={tableTh}>Cuenta</th>
                    <th style={tableTh}>Concepto línea</th>
                    <th style={{ ...tableTh, textAlign: "right", width: 120 }}>Debe</th>
                    <th style={{ ...tableTh, textAlign: "right", width: 120 }}>Haber</th>
                    <th style={{ ...tableTh, width: 32 }} />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => {
                    const accountName = accountMap.get(l.accountCode.trim()) || "";
                    return (
                      <tr key={idx} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={tableTd}>
                          <input
                            list="account-list"
                            value={l.accountCode}
                            onChange={(e) => updateLine(idx, { accountCode: e.target.value })}
                            placeholder="572"
                            style={inputBorderless}
                          />
                          {accountName && (
                            <div style={{ fontSize: 10.5, color: "var(--text-muted)", padding: "0 10px 4px" }}>
                              {accountName}
                            </div>
                          )}
                        </td>
                        <td style={tableTd}>
                          <input
                            value={l.concept}
                            onChange={(e) => updateLine(idx, { concept: e.target.value })}
                            placeholder="Descripción"
                            style={inputBorderless}
                          />
                        </td>
                        <td style={{ ...tableTd, textAlign: "right" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.debit === 0 ? "" : l.debit}
                            onChange={(e) => updateLine(idx, {
                              debit: Number(e.target.value) || 0,
                              credit: Number(e.target.value) > 0 ? 0 : l.credit,
                            })}
                            placeholder="0,00"
                            style={{ ...inputBorderless, textAlign: "right" }}
                          />
                        </td>
                        <td style={{ ...tableTd, textAlign: "right" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.credit === 0 ? "" : l.credit}
                            onChange={(e) => updateLine(idx, {
                              credit: Number(e.target.value) || 0,
                              debit: Number(e.target.value) > 0 ? 0 : l.debit,
                            })}
                            placeholder="0,00"
                            style={{ ...inputBorderless, textAlign: "right" }}
                          />
                        </td>
                        <td style={{ ...tableTd, textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            disabled={lines.length <= 2}
                            style={{
                              color: "var(--text-faint)", padding: 4,
                              opacity: lines.length <= 2 ? 0.3 : 1,
                            }}
                            title="Eliminar línea"
                          >
                            <Icon name="trash" size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "1.5px solid var(--border-strong)", background: "var(--beige-bg)" }}>
                    <td colSpan={2} style={{ ...tableTd, padding: "10px 12px" }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Totales
                      </span>
                    </td>
                    <td style={{ ...tableTd, textAlign: "right", padding: "10px 12px", fontWeight: 600 }}>
                      {fmtEur(totals.debit)}
                    </td>
                    <td style={{ ...tableTd, textAlign: "right", padding: "10px 12px", fontWeight: 600 }}>
                      {fmtEur(totals.credit)}
                    </td>
                    <td />
                  </tr>
                  <tr style={{ background: totals.balanced ? "#E8F1EA" : "#F5E1E1" }}>
                    <td colSpan={2} style={{ ...tableTd, padding: "8px 12px" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: totals.balanced ? "var(--success)" : "var(--error)" }}>
                        {totals.balanced ? "✓ Asiento cuadrado" : `Diferencia: ${fmtEur(Math.abs(totals.diff))}`}
                      </span>
                    </td>
                    <td colSpan={3} style={{ ...tableTd, padding: "8px 12px", textAlign: "right" }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Suma Debe debe igualar Suma Haber
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
              {/* datalist global con todas las cuentas activas */}
              <datalist id="account-list">
                {allAccounts.map((a) => (
                  <option key={a.code} value={a.code}>{a.code} · {a.name}</option>
                ))}
              </datalist>
            </div>
          </div>

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
          <Button type="submit" variant="primary" disabled={saving || !totals.balanced}>
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear asiento"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StatStrip({ label, value, sub, color = "var(--text)" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card padding={16}>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color, letterSpacing: "-0.01em" }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </Card>
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

const tableTh: React.CSSProperties = {
  textAlign: "left", padding: "8px 12px", fontSize: 10.5, fontWeight: 500,
  color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
};

const tableTd: React.CSSProperties = {
  padding: 0, verticalAlign: "middle",
};

const inputBorderless: React.CSSProperties = {
  width: "100%", height: 34, padding: "0 12px",
  border: "1px solid transparent", background: "transparent",
  outline: "none", fontSize: 13, fontFamily: "inherit",
};
