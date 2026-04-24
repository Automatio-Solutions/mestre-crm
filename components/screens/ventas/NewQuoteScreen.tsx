"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Icon, Button, Card, Input, Dropdown, DropdownItem,
} from "@/components/ui";
import { useQuotes } from "@/lib/db/useQuotes";
import { useContacts } from "@/lib/db/useContacts";
import type { Quote, QuoteLine, QuoteStatus } from "@/lib/db/quotes";
import { calcLineSubtotal, calcInvoiceTotals, emptyLine } from "@/lib/db/invoices";
import { ConceptAutocomplete } from "./ConceptAutocomplete";
import { ContactAutocomplete } from "./ContactAutocomplete";
import { QuoteDocument } from "./QuoteDocument";
import { QuotePreviewModal } from "./QuotePreviewModal";
import { generateQuotePdf } from "@/lib/pdf/generateQuotePdf";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import * as D from "@/lib/data";

const toISODate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

const nextQuoteNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, "0");
  return `PR-${year}-${rand}`;
};

export function NewQuoteScreen({ quoteId }: { quoteId?: string } = {}) {
  const router = useRouter();
  const { contacts } = useContacts();
  const { quotes, create, update } = useQuotes();

  const editing = quoteId ? quotes.find((q) => q.id === quoteId) : null;
  const isEdit = !!quoteId;

  const [number, setNumber] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [issueDate, setIssueDate] = useState(toISODate(new Date()));
  const [expireDate, setExpireDate] = useState(toISODate(new Date(Date.now() + 30 * 86400000)));
  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);
  const [probability, setProbability] = useState<number>(30);
  const [owner, setOwner] = useState<string>("");
  const [source, setSource] = useState("");
  const [terms, setTerms] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [showDocText, setShowDocText] = useState(false);
  const [docText, setDocText] = useState("");
  const [showDocFooter, setShowDocFooter] = useState(false);
  const [docFooterMessage, setDocFooterMessage] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const hiddenDocRef = useRef<HTMLDivElement>(null);

  // Precarga en modo edición
  useEffect(() => {
    if (editing) {
      setNumber(editing.number);
      setClientId(editing.clientId || "");
      setIssueDate(toISODate(editing.issueDate));
      setExpireDate(toISODate(editing.expireDate));
      setLines(editing.lines.length > 0 ? editing.lines : [emptyLine()]);
      setProbability(editing.probability);
      setOwner(editing.owner || "");
      setSource(editing.source || "");
      setTerms(editing.terms || "");
      setInternalNote(editing.internalNote || "");
      setTagsInput((editing.tags || []).join(", "));
      setShowCustomFields(editing.showCustomFields);
      setShowDocText(!!editing.docText);
      setDocText(editing.docText || "");
      setShowDocFooter(!!editing.docFooterMessage);
      setDocFooterMessage(editing.docFooterMessage || "");
      setShowDiscount(editing.lines.some((l) => l.discount > 0));
    } else if (!isEdit) {
      setNumber(nextQuoteNumber());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, isEdit]);

  const updateLine = (id: string, patch: Partial<QuoteLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLine = (id: string) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const totals = useMemo(() => calcInvoiceTotals(lines), [lines]);
  const vatPct = lines.length > 0 ? lines[0].vat : 21;
  const hasDiscount = showDiscount || lines.some((l) => l.discount > 0);

  const buildDraftQuote = (): Quote => ({
    id: editing?.id || "draft",
    number: number.trim() || "DRAFT",
    clientId: clientId || null,
    concept: lines[0]?.concept || null,
    amount: totals.total,
    vatPct,
    status: "borrador",
    issueDate: issueDate ? new Date(issueDate) : new Date(),
    expireDate: expireDate ? new Date(expireDate) : null,
    owner: owner || null,
    probability,
    viewed: false,
    viewCount: 0,
    acceptedDate: null,
    rejectedDate: null,
    rejectReason: null,
    internalNote: internalNote || null,
    source: source || null,
    lines,
    terms: terms || null,
    tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
    showCustomFields,
    docText: showDocText ? docText : null,
    docFooterMessage: showDocFooter ? docFooterMessage : null,
  });

  const selectedClient = contacts.find((c) => c.id === clientId) || null;

  const save = async (status: QuoteStatus) => {
    if (!number.trim()) return setErr("El número es obligatorio.");
    if (lines.length === 0 || totals.total <= 0) return setErr("Añade al menos una línea con precio.");
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        number: number.trim(),
        clientId: clientId || null,
        concept: lines[0]?.concept || null,
        amount: totals.total,
        vatPct,
        status,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        expireDate: expireDate ? new Date(expireDate) : null,
        owner: owner || null,
        probability,
        source: source || null,
        internalNote: internalNote || null,
        lines,
        terms: terms || null,
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        showCustomFields,
        docText: showDocText ? docText || null : null,
        docFooterMessage: showDocFooter ? docFooterMessage || null : null,
      };
      if (isEdit && editing) {
        await update(editing.id, payload);
        router.push(`/ventas/presupuestos/${editing.id}`);
      } else {
        const created = await create(payload);
        router.push(`/ventas/presupuestos/${created.id}`);
      }
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!hiddenDocRef.current) return;
    setDownloadingPdf(true);
    try {
      await generateQuotePdf(hiddenDocRef.current, buildDraftQuote());
    } catch (e) {
      console.error(e);
      alert("Error generando el PDF. Revisa la consola.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", background: "var(--bg)" }}>
      {/* Header sticky */}
      <div
        style={{
          position: "sticky", top: 64, zIndex: 20,
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 24px",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Button variant="ghost" size="icon" onClick={() => router.push("/ventas/presupuestos")} title="Volver">
          <Icon name="chevronLeft" size={14} />
        </Button>
        <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: "-0.01em" }}>
          {isEdit ? `Editar presupuesto ${number}` : "Nuevo presupuesto"}
        </h1>
        <div style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" leftIcon={<Icon name="eye" size={13} />} onClick={() => setPreviewOpen(true)}>
          Vista previa
        </Button>
        <Dropdown
          align="end"
          trigger={<Button variant="ghost" size="sm" leftIcon={<Icon name="settings" size={13} />}>Opciones</Button>}
        >
          <DropdownItem leftIcon={<Icon name="download" size={13} />} onClick={handleDownloadPdf}>
            {downloadingPdf ? "Generando…" : "Descargar PDF"}
          </DropdownItem>
          <DropdownItem leftIcon={<Icon name="fileText" size={13} />}>Guardar como plantilla</DropdownItem>
        </Dropdown>
        <Button variant="outline" size="sm" onClick={() => save("borrador")} disabled={saving}>
          {saving ? "Guardando…" : "Guardar como borrador"}
        </Button>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Icon name="mail" size={13} />}
          onClick={() => save("enviado")}
          disabled={saving}
        >
          Enviar
        </Button>
      </div>

      <div style={{ padding: "24px 32px 80px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Cabecera */}
        <Card padding={20} style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <FormField label="Contacto">
              <ContactAutocomplete value={clientId} onChange={setClientId} />
            </FormField>
            <FormField label="Número de documento">
              <Input value={number} onChange={(e) => setNumber(e.target.value)} />
            </FormField>
            <FormField label="Fecha emisión">
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </FormField>
            <FormField label="Válido hasta">
              <Input type="date" value={expireDate} onChange={(e) => setExpireDate(e.target.value)} />
            </FormField>
          </div>
        </Card>

        {/* Tabla líneas */}
        <Card padding={0} style={{ overflow: "visible", marginBottom: 14 }}>
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--beige-bg)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ ...thStyle, width: 28 }} />
                  <th style={{ ...thStyle, minWidth: 240 }}>Concepto</th>
                  <th style={{ ...thStyle, minWidth: 180 }}>Descripción</th>
                  <th style={{ ...thStyle, width: 80, textAlign: "right" }}>Cantidad</th>
                  <th style={{ ...thStyle, width: 90, textAlign: "right" }}>Precio</th>
                  {hasDiscount && <th style={{ ...thStyle, width: 80, textAlign: "right" }}>Dto. %</th>}
                  <th style={{ ...thStyle, width: 140 }}>Impuestos</th>
                  <th style={{ ...thStyle, width: 100, textAlign: "right" }}>Total</th>
                  <th style={{ ...thStyle, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const subtotal = calcLineSubtotal(line);
                  return (
                    <tr key={line.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ ...tdCell, color: "var(--text-faint)", fontSize: 11, textAlign: "center" }}>
                        {idx + 1}
                      </td>
                      <td style={tdCell}>
                        <ConceptAutocomplete
                          value={line.concept}
                          onChange={(v) => updateLine(line.id, { concept: v })}
                          onSelectService={(svc) =>
                            updateLine(line.id, {
                              description: svc.description || line.description,
                              price: svc.price,
                              vat: svc.vat,
                              serviceId: svc.id,
                              concept: svc.name,
                            })
                          }
                          placeholder="Escribe el concepto o usa @ para buscar"
                          style={borderlessInputStyle}
                        />
                      </td>
                      <td style={tdCell}>
                        <AutoResizeTextarea
                          value={line.description}
                          onChange={(e) => updateLine(line.id, { description: e.target.value })}
                          placeholder="Desc."
                          style={borderlessTextareaStyle}
                        />
                      </td>
                      <td style={{ ...tdCell, textAlign: "right" }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity === 0 ? "" : line.quantity}
                          onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) || 0 })}
                          placeholder="0"
                          style={{ ...borderlessInputStyle, textAlign: "right" }}
                        />
                      </td>
                      <td style={{ ...tdCell, textAlign: "right" }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.price === 0 ? "" : line.price}
                          onChange={(e) => updateLine(line.id, { price: Number(e.target.value) || 0 })}
                          placeholder="0"
                          style={{ ...borderlessInputStyle, textAlign: "right" }}
                        />
                      </td>
                      {hasDiscount && (
                        <td style={{ ...tdCell, textAlign: "right" }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={line.discount === 0 ? "" : line.discount}
                            onChange={(e) => updateLine(line.id, { discount: Number(e.target.value) || 0 })}
                            placeholder="0"
                            style={{ ...borderlessInputStyle, textAlign: "right" }}
                          />
                        </td>
                      )}
                      <td style={tdCell}>
                        <VatChip value={line.vat} onChange={(v) => updateLine(line.id, { vat: v })} />
                      </td>
                      <td style={{ ...tdCell, textAlign: "right", fontWeight: 500, paddingRight: 12 }}>
                        {subtotal.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </td>
                      <td style={{ ...tdCell, textAlign: "center", width: 40 }}>
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length <= 1}
                          style={{ color: "var(--text-faint)", padding: 4, opacity: lines.length <= 1 ? 0.3 : 1 }}
                          title="Eliminar línea"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", borderTop: "1px solid var(--border)", background: "var(--beige-bg)",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" size="sm" leftIcon={<Icon name="plus" size={13} />} onClick={addLine}>
                Añadir línea
              </Button>
              {!hasDiscount && (
                <Button variant="ghost" size="sm" leftIcon={<Icon name="plus" size={13} />} onClick={() => setShowDiscount(true)}>
                  Añadir descuento
                </Button>
              )}
              {showDiscount && !lines.some((l) => l.discount > 0) && (
                <Button variant="ghost" size="sm" onClick={() => setShowDiscount(false)}>
                  Ocultar descuento
                </Button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, minWidth: 240 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                <span>{totals.base.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>IVA</span>
                <span>{totals.vat.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--border)", fontWeight: 600, fontSize: 15 }}>
                <span>Total</span>
                <span>{totals.total.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Toggles */}
        <Card padding={16} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Check checked={showCustomFields} onChange={setShowCustomFields} label="Campos personalizados" />
            <Check checked={showDocText} onChange={setShowDocText} label="Añadir texto en el documento" />
            {showDocText && (
              <textarea
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                placeholder="Texto en el documento"
                rows={3}
                style={textareaStyle}
              />
            )}
            <Check checked={showDocFooter} onChange={setShowDocFooter} label="Añadir mensaje al final" />
            {showDocFooter && (
              <textarea
                value={docFooterMessage}
                onChange={(e) => setDocFooterMessage(e.target.value)}
                placeholder="Mensaje al pie"
                rows={3}
                style={textareaStyle}
              />
            )}
          </div>
        </Card>

        {/* Pipeline + Categorización */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card padding={20}>
            <h3 style={blockTitle}>Pipeline</h3>
            <FormField label="Probabilidad de cierre">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={probability}
                  onChange={(e) => setProbability(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ minWidth: 48, textAlign: "right", fontWeight: 500 }}>
                  {probability}%
                </span>
              </div>
            </FormField>
            <FormField label="Responsable" style={{ marginTop: 10 }}>
              <select value={owner} onChange={(e) => setOwner(e.target.value)} style={selectStyle}>
                <option value="">(Sin asignar)</option>
                {D.USERS.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} · {u.role}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Origen" style={{ marginTop: 10 }}>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Referencia, web, evento…" />
            </FormField>
          </Card>

          <Card padding={20}>
            <h3 style={blockTitle}>Categorización</h3>
            <FormField label="Etiquetas">
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="tags separadas por coma" />
            </FormField>
            <FormField label="Nota interna" style={{ marginTop: 10 }}>
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Contexto para el equipo, no sale en el documento"
                rows={3}
                style={textareaStyle}
              />
            </FormField>
          </Card>
        </div>

        {/* Condiciones del presupuesto (aparece en el PDF) */}
        <Card padding={20} style={{ marginTop: 14 }}>
          <h3 style={blockTitle}>Condiciones del presupuesto</h3>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 8 }}>
            Aparecerá en el PDF. Ej: duración, forma de pago, validez, entregables…
          </div>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Condiciones…"
            rows={4}
            style={textareaStyle}
          />
        </Card>

        {err && (
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--error)", background: "#F5E1E1", padding: "10px 14px", borderRadius: 8 }}>
            {err}
          </div>
        )}
      </div>

      {/* Modal vista previa */}
      <QuotePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        quote={buildDraftQuote()}
        client={selectedClient}
      />

      {/* Documento oculto para PDF */}
      <div
        aria-hidden
        style={{ position: "fixed", top: 0, left: -10000, opacity: 0, pointerEvents: "none" }}
      >
        <QuoteDocument ref={hiddenDocRef} quote={buildDraftQuote()} client={selectedClient} />
      </div>
    </div>
  );
}

// ========== VatChip (reutilizado de NewInvoiceScreen) ==========

function VatChip({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [picking, setPicking] = useState(false);
  const presets = [0, 4, 10, 21];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!picking) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPicking(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [picking]);

  const active = value > 0;
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      {active ? (
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 4px 3px 8px", borderRadius: 6,
            background: "var(--beige-light)", border: "1px solid var(--border)",
            fontSize: 12, fontWeight: 500, color: "var(--text)",
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(0); }}
            title="Quitar IVA"
            style={{
              width: 16, height: 16, borderRadius: 3, display: "inline-flex",
              alignItems: "center", justifyContent: "center", color: "var(--text-muted)", padding: 0,
            }}
          >
            <Icon name="x" size={10} />
          </button>
          <button type="button" onClick={() => setPicking((p) => !p)} style={{ fontSize: 12, fontWeight: 500, padding: 0, background: "transparent", color: "inherit" }}>
            IVA {value}%
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 12, color: "var(--text-muted)", background: "transparent",
            padding: "3px 6px", borderRadius: 6, border: "1px dashed var(--border)",
          }}
        >
          <Icon name="plus" size={10} /> IVA
        </button>
      )}
      {picking && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, boxShadow: "var(--shadow-md)", padding: 4,
            zIndex: 30, minWidth: 120, display: "flex", flexDirection: "column", gap: 2,
          }}
        >
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { onChange(p); setPicking(false); }}
              style={{
                padding: "6px 10px", textAlign: "left", fontSize: 12.5, borderRadius: 5,
                background: value === p ? "var(--beige-light)" : "transparent", color: "var(--text)",
              }}
            >
              {p === 0 ? "Sin IVA" : `IVA ${p}%`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Helpers ==========

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function FormField({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
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

const textareaStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: 13,
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--surface)", outline: "none",
  fontFamily: "inherit", resize: "vertical",
};

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 500,
  color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
};

const tdCell: React.CSSProperties = {
  padding: "2px 0", verticalAlign: "middle",
};

const borderlessInputStyle: React.CSSProperties = {
  width: "100%", height: 36, padding: "0 12px",
  border: "1px solid transparent", borderRadius: 0,
  background: "transparent", outline: "none", fontSize: 13,
};

const borderlessTextareaStyle: React.CSSProperties = {
  width: "100%", minHeight: 36, padding: "8px 12px",
  border: "1px solid transparent", borderRadius: 0,
  background: "transparent", outline: "none", fontSize: 13,
  fontFamily: "inherit", resize: "vertical", lineHeight: 1.4,
};

const blockTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, margin: "0 0 12px",
};
