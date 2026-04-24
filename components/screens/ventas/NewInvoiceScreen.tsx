"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Icon, Button, Card, Badge, Input, Dropdown, DropdownItem, DropdownSeparator,
} from "@/components/ui";
import { useInvoices } from "@/lib/db/useInvoices";
import { useContacts } from "@/lib/db/useContacts";
import {
  type Invoice, type InvoiceLine, type PaymentMethod,
  calcLineSubtotal, calcLineVat, calcInvoiceTotals, emptyLine,
} from "@/lib/db/invoices";
import { ConceptAutocomplete } from "./ConceptAutocomplete";
import { ContactAutocomplete } from "./ContactAutocomplete";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import { generateInvoicePdf } from "@/lib/pdf/generateInvoicePdf";
import { InvoiceDocument } from "./InvoiceDocument";
import { AutoResizeTextarea } from "./AutoResizeTextarea";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; defaultNotes: string }[] = [
  { id: "none", label: "No seleccionada", defaultNotes: "" },
  { id: "transferencia", label: "Transferencia bancaria", defaultNotes: "Pagar por transferencia bancaria al siguiente número de cuenta\nES88 0182 1508 5202 0170 3834" },
  { id: "contado", label: "Pago al contado", defaultNotes: "Pago al contado" },
  { id: "domiciliado", label: "Recibo Domiciliado en Cuenta", defaultNotes: "Recibo domiciliado en cuenta bancaria" },
];

const ACCOUNTS = [
  "70500001 · Prestación de servicios",
  "70000001 · Ventas de mercaderías",
  "70500002 · Publicidad Digital",
  "70500003 · Consultoría",
  "70500004 · Desarrollo",
];

const toISODate = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";

const nextInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, "0");
  return `FA${String(year).slice(-2)}${rand}`;
};

/**
 * Pantalla completa para crear o editar una factura.
 * - Líneas múltiples con @servicio autocompletado
 * - Método de pago con texto editable
 * - Categorización (cuenta contable, etiquetas, nota interna)
 */
export function NewInvoiceScreen({ invoiceId }: { invoiceId?: string } = {}) {
  const router = useRouter();
  const { contacts } = useContacts();
  const { invoices, create, update } = useInvoices();

  const editing = invoiceId ? invoices.find((i) => i.id === invoiceId) : null;
  const isEdit = !!invoiceId;

  const [number, setNumber] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [issueDate, setIssueDate] = useState(toISODate(new Date()));
  const [dueDate, setDueDate] = useState(toISODate(new Date(Date.now() + 30 * 86400000)));
  const [lines, setLines] = useState<InvoiceLine[]>([emptyLine()]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia");
  const [paymentNotes, setPaymentNotes] = useState<string>(PAYMENT_METHODS[1].defaultNotes);
  const [account, setAccount] = useState<string>(ACCOUNTS[0]);
  const [accountByConcept, setAccountByConcept] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [internalNote, setInternalNote] = useState("");
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

  // Si estamos editando, precargar
  useEffect(() => {
    if (editing) {
      setNumber(editing.number);
      setClientId(editing.clientId || "");
      setIssueDate(toISODate(editing.issueDate));
      setDueDate(toISODate(editing.dueDate));
      setLines(editing.lines.length > 0 ? editing.lines : [emptyLine()]);
      setPaymentMethod(editing.paymentMethod);
      setPaymentNotes(editing.paymentNotes || "");
      setAccount(editing.account || ACCOUNTS[0]);
      setAccountByConcept(editing.accountByConcept);
      setTagsInput((editing.tags || []).join(", "));
      setInternalNote(editing.internalNote || "");
      setShowCustomFields(editing.showCustomFields);
      setShowDocText(!!editing.docText);
      setDocText(editing.docText || "");
      setShowDocFooter(!!editing.docFooterMessage);
      setDocFooterMessage(editing.docFooterMessage || "");
      setShowDiscount(editing.lines.some((l) => l.discount > 0));
    } else if (!isEdit) {
      setNumber(nextInvoiceNumber());
      // Contacto: vacío a propósito — el usuario lo elige manualmente
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, isEdit]);

  // Totales
  const totals = useMemo(() => calcInvoiceTotals(lines), [lines]);
  const vatPct = lines.length > 0 ? lines[0].vat : 21;

  // Handlers de líneas
  const updateLine = (id: string, patch: Partial<InvoiceLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };
  const removeLine = (id: string) => {
    setLines((prev) => prev.length > 1 ? prev.filter((l) => l.id !== id) : prev);
  };
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const handlePaymentMethodChange = (id: PaymentMethod) => {
    setPaymentMethod(id);
    const preset = PAYMENT_METHODS.find((m) => m.id === id);
    if (preset && !paymentNotes.trim()) {
      setPaymentNotes(preset.defaultNotes);
    }
    // Si el texto actual coincide con el default de otro método, lo reemplazamos
    const wasDefault = PAYMENT_METHODS.some((m) => m.defaultNotes === paymentNotes);
    if (wasDefault && preset) setPaymentNotes(preset.defaultNotes);
  };

  const save = async (status: "borrador" | "pendiente") => {
    if (!number.trim()) return setErr("El número es obligatorio.");
    if (lines.length === 0 || totals.total <= 0) return setErr("Añade al menos una línea con precio.");
    setSaving(true);
    setErr(null);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        number: number.trim(),
        clientId: clientId || null,
        concept: lines[0]?.concept || null,
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        base: totals.base,
        vatPct: vatPct,
        total: totals.total,
        status,
        lines,
        paymentMethod,
        paymentNotes: paymentNotes || null,
        account: account || null,
        accountByConcept,
        internalNote: internalNote || null,
        tags,
        showCustomFields,
        docText: showDocText ? (docText || null) : null,
        docFooterMessage: showDocFooter ? (docFooterMessage || null) : null,
      };
      if (isEdit && editing) {
        await update(editing.id, payload);
        router.push(`/ventas/facturas/${editing.id}`);
      } else {
        const created = await create(payload);
        router.push(`/ventas/facturas/${created.id}`);
      }
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const hasDiscount = showDiscount || lines.some((l) => l.discount > 0);

  // Construye el objeto Invoice "virtual" para previews/PDF a partir del form actual
  const buildDraftInvoice = () => ({
    id: editing?.id || "draft",
    number: number.trim() || "DRAFT",
    clientId: clientId || null,
    issueDate: issueDate ? new Date(issueDate) : new Date(),
    dueDate: dueDate ? new Date(dueDate) : null,
    base: totals.base,
    vatPct,
    total: totals.total,
    status: "borrador" as const,
    concept: lines[0]?.concept || null,
    lines,
    paymentMethod,
    paymentNotes: paymentNotes || null,
    account: account || null,
    accountByConcept,
    internalNote: internalNote || null,
    tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
    showCustomFields,
    docText: showDocText ? docText : null,
    docFooterMessage: showDocFooter ? docFooterMessage : null,
  });
  const selectedClient = contacts.find((c) => c.id === clientId) || null;

  const handleDownloadPdf = async () => {
    if (!hiddenDocRef.current) return;
    setDownloadingPdf(true);
    try {
      await generateInvoicePdf(hiddenDocRef.current, buildDraftInvoice() as any);
    } catch (e) {
      console.error(e);
      alert("Error generando el PDF. Revisa la consola.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", background: "var(--bg)" }}>
      {/* ====== Header sticky ====== */}
      <div
        style={{
          position: "sticky", top: 64, zIndex: 20,
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 24px",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Button variant="ghost" size="icon" onClick={() => router.push("/ventas/facturas")} title="Volver">
          <Icon name="chevronLeft" size={14} />
        </Button>
        <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: "-0.01em" }}>
          {isEdit ? `Editar factura ${number}` : "Nueva factura"}
        </h1>
        <div style={{ flex: 1 }} />
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="eye" size={13} />}
          onClick={() => setPreviewOpen(true)}
        >
          Vista previa
        </Button>
        <Dropdown
          align="end"
          trigger={<Button variant="ghost" size="sm" leftIcon={<Icon name="settings" size={13} />}>Opciones</Button>}
        >
          <DropdownItem
            leftIcon={<Icon name="download" size={13} />}
            onClick={handleDownloadPdf}
          >
            {downloadingPdf ? "Generando…" : "Descargar PDF"}
          </DropdownItem>
          <DropdownItem leftIcon={<Icon name="fileText" size={13} />}>Guardar como plantilla</DropdownItem>
        </Dropdown>
        <Button variant="outline" size="sm" onClick={() => save("borrador")} disabled={saving}>
          {saving ? "Guardando…" : "Guardar como borrador"}
        </Button>
        <Button variant="primary" size="sm" leftIcon={<Icon name="check" size={13} />} onClick={() => save("pendiente")} disabled={saving}>
          Aprobar
        </Button>
      </div>

      <div style={{ padding: "24px 32px 80px", maxWidth: 1400, margin: "0 auto" }}>
        {/* ====== Bloque cabecera factura ====== */}
        <Card padding={20} style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <FormField label="Contacto">
              <ContactAutocomplete value={clientId} onChange={setClientId} />
            </FormField>
            <FormField label="Número de documento">
              <Input value={number} onChange={(e) => setNumber(e.target.value)} />
            </FormField>
            <FormField label="Fecha">
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </FormField>
            <FormField label="Vencimiento">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormField>
          </div>
        </Card>

        {/* ====== Tabla de líneas (borderless inputs, estilo tabla continua) ====== */}
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
                  {hasDiscount && (
                    <th style={{ ...thStyle, width: 80, textAlign: "right" }}>Dto. %</th>
                  )}
                  <th style={{ ...thStyle, width: 140 }}>Impuestos</th>
                  <th style={{ ...thStyle, width: 100, textAlign: "right" }}>Total</th>
                  <th style={{ ...thStyle, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const subtotal = calcLineSubtotal(line);
                  return (
                    <tr
                      key={line.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td style={{ ...tdCell, color: "var(--text-faint)", fontSize: 11, textAlign: "center", width: 28 }}>
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
                        <VatChip
                          value={line.vat}
                          onChange={(v) => updateLine(line.id, { vat: v })}
                        />
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
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", borderTop: "1px solid var(--border)", background: "var(--beige-bg)",
          }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" size="sm" leftIcon={<Icon name="plus" size={13} />} onClick={addLine}>
                Añadir línea
              </Button>
              {!hasDiscount && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Icon name="plus" size={13} />}
                  onClick={() => setShowDiscount(true)}
                >
                  Añadir descuento
                </Button>
              )}
              {showDiscount && !lines.some((l) => l.discount > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDiscount(false)}
                >
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

        {/* ====== Toggles adicionales ====== */}
        <Card padding={16} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Check checked={showCustomFields} onChange={setShowCustomFields} label="Campos personalizados" />
            <Check checked={showDocText} onChange={setShowDocText} label="Añadir texto en el documento" />
            {showDocText && (
              <textarea
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                placeholder="Texto que aparecerá en el documento, debajo de las líneas"
                rows={3}
                style={textareaStyle}
              />
            )}
            <Check checked={showDocFooter} onChange={setShowDocFooter} label="Añadir mensaje al final" />
            {showDocFooter && (
              <textarea
                value={docFooterMessage}
                onChange={(e) => setDocFooterMessage(e.target.value)}
                placeholder="Mensaje al pie del documento (gracias, condiciones, etc.)"
                rows={3}
                style={textareaStyle}
              />
            )}
          </div>
        </Card>

        {/* ====== Método de pago + Categorización ====== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card padding={20}>
            <h3 style={blockTitle}>Método de pago</h3>
            <FormField label="Selecciona una forma de pago">
              <select
                value={paymentMethod}
                onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}
                style={selectStyle}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </FormField>
            <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-muted)" }}>
              Este texto aparecerá en el documento:
            </div>
            <textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Instrucciones de pago para el cliente…"
              rows={3}
              style={{ ...textareaStyle, marginTop: 6 }}
            />
          </Card>

          <Card padding={20}>
            <h3 style={blockTitle}>Categorización</h3>
            <FormField label="Cuenta contable">
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                style={selectStyle}
              >
                {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </FormField>
            <Check
              checked={accountByConcept}
              onChange={setAccountByConcept}
              label="Cuenta por concepto"
              small
            />
            <FormField label="Etiquetas" style={{ marginTop: 10 }}>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="tags separadas por coma"
              />
            </FormField>
            <FormField label="Nota interna" style={{ marginTop: 10 }}>
              <Input
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Nota interna"
              />
            </FormField>
          </Card>
        </div>

        {err && (
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--error)", background: "#F5E1E1", padding: "10px 14px", borderRadius: 8 }}>
            {err}
          </div>
        )}
      </div>

      {/* Modal de vista previa */}
      <InvoicePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        invoice={buildDraftInvoice() as any}
        client={selectedClient}
      />

      {/* Documento oculto usado para generar el PDF (off-screen) */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: -10000,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <InvoiceDocument
          ref={hiddenDocRef}
          invoice={buildDraftInvoice() as any}
          client={selectedClient}
        />
      </div>
    </div>
  );
}

// ========== Sub-components ==========

/**
 * Chip para el IVA con X para quitarlo.
 * - Si vat > 0: muestra "× IVA {pct}%" como pill clickable (cambiar %) con X (quitar)
 * - Si vat === 0: botón "+ Añadir IVA" que abre el selector
 */
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

  const activeVat = value > 0;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      {activeVat ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 4px 3px 8px",
            borderRadius: 6,
            background: "var(--beige-light)",
            border: "1px solid var(--border)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text)",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(0);
            }}
            title="Quitar IVA"
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--beige-dark)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <Icon name="x" size={10} />
          </button>
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: 0,
              background: "transparent",
              color: "inherit",
            }}
          >
            IVA {value}%
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: "var(--text-muted)",
            background: "transparent",
            padding: "3px 6px",
            borderRadius: 6,
            border: "1px dashed var(--border)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--beige-bg)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <Icon name="plus" size={10} /> IVA
        </button>
      )}

      {picking && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "var(--shadow-md)",
            padding: 4,
            zIndex: 30,
            minWidth: 120,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                setPicking(false);
              }}
              style={{
                padding: "6px 10px",
                textAlign: "left",
                fontSize: 12.5,
                borderRadius: 5,
                background: value === p ? "var(--beige-light)" : "transparent",
                color: "var(--text)",
              }}
              onMouseEnter={(e) => {
                if (value !== p) e.currentTarget.style.background = "var(--beige-bg)";
              }}
              onMouseLeave={(e) => {
                if (value !== p) e.currentTarget.style.background = "transparent";
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

function Check({
  checked, onChange, label, small,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  small?: boolean;
}) {
  return (
    <label style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      fontSize: small ? 12 : 13, color: "var(--text)", cursor: "pointer",
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function FormField({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      <span style={{
        fontSize: 11, fontWeight: 500, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {label}
      </span>
      {children}
    </label>
  );
}

// ========== Styles ==========

const selectStyle: React.CSSProperties = {
  height: 34,
  width: "100%",
  padding: "0 10px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--surface)",
  outline: "none",
  fontSize: 13.5,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--surface)",
  outline: "none",
  fontFamily: "inherit",
  resize: "vertical",
};

const numInputStyle: React.CSSProperties = {
  width: "100%",
  height: 32,
  padding: "0 8px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "var(--surface)",
  outline: "none",
  fontSize: 13,
  
  textAlign: "right",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 500,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

// Celda de la tabla: sin bordes verticales, solo horizontal en el <tr>.
const tdCell: React.CSSProperties = {
  padding: "2px 0",
  verticalAlign: "middle",
};

// Input sin caja visible. Solo al enfocar se ve un anillo sutil.
const borderlessInputStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  padding: "0 12px",
  border: "1px solid transparent",
  borderRadius: 0,
  background: "transparent",
  outline: "none",
  fontSize: 13,
};

const borderlessTextareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 36,
  padding: "8px 12px",
  border: "1px solid transparent",
  borderRadius: 0,
  background: "transparent",
  outline: "none",
  fontSize: 13,
  fontFamily: "inherit",
  resize: "vertical",
  lineHeight: 1.4,
};

const blockTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, margin: "0 0 12px",
};
