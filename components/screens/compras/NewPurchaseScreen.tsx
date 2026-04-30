"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Icon, Button, Card, Input,
} from "@/components/ui";
import { useContacts } from "@/lib/db/useContacts";
import { usePurchases } from "@/lib/db/usePurchases";
import type { Purchase, PurchaseLine, PurchaseStatus, PurchasePaymentMethod } from "@/lib/db/purchases";
import { calcLineSubtotal, calcInvoiceTotals, emptyLine } from "@/lib/db/invoices";
import { ContactAutocomplete } from "@/components/screens/ventas/ContactAutocomplete";
import { AutoResizeTextarea } from "@/components/screens/ventas/AutoResizeTextarea";
import { PAYMENT_METHODS_PURCHASE, EXPENSE_CATEGORIES, EXPENSE_ACCOUNTS } from "./shared";

const toISODate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

export function NewPurchaseScreen({ purchaseId }: { purchaseId?: string } = {}) {
  const router = useRouter();
  const { contacts } = useContacts();
  const { purchases, create, update } = usePurchases();

  const editing = purchaseId ? purchases.find((p) => p.id === purchaseId) : null;
  const isEdit = !!purchaseId;

  const [supplierId, setSupplierId] = useState("");
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState(toISODate(new Date()));
  const [payDate, setPayDate] = useState("");
  const [category, setCategory] = useState<string>("");
  const [account, setAccount] = useState<string>(EXPENSE_ACCOUNTS[0]);
  const [paymentMethod, setPaymentMethod] = useState<PurchasePaymentMethod>("transferencia");
  const [status, setStatus] = useState<PurchaseStatus>("pendiente");
  const [lines, setLines] = useState<PurchaseLine[]>([emptyLine()]);
  const [tagsInput, setTagsInput] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setSupplierId(editing.supplierId || "");
      setNumber(editing.number || "");
      setIssueDate(toISODate(editing.issueDate));
      setPayDate(toISODate(editing.payDate));
      setCategory(editing.category || "");
      setAccount(editing.account || EXPENSE_ACCOUNTS[0]);
      setPaymentMethod(editing.paymentMethod);
      setStatus(editing.status);
      setLines(editing.lines.length > 0 ? editing.lines : [emptyLine()]);
      setTagsInput((editing.tags || []).join(", "));
      setInternalNote(editing.internalNote || "");
      setShowDiscount(editing.lines.some((l) => l.discount > 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  const totals = useMemo(() => calcInvoiceTotals(lines), [lines]);
  const vatPct = lines.length > 0 ? lines[0].vat : 21;
  const hasDiscount = showDiscount || lines.some((l) => l.discount > 0);

  const updateLine = (id: string, patch: Partial<PurchaseLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLine = (id: string) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const save = async () => {
    if (lines.length === 0 || totals.total <= 0) return setErr("Añade al menos una línea con precio.");
    setSaving(true);
    setErr(null);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        supplierId: supplierId || null,
        number: number.trim() || null,
        concept: lines[0]?.concept || null,
        category: category || null,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        payDate: payDate ? new Date(payDate) : null,
        base: totals.base,
        vatPct,
        vat: totals.vat,
        total: totals.total,
        status,
        paymentMethod,
        source: "upload" as const,
        account: account || null,
        lines,
        tags,
        attachments: files.map((f) => f.name),
        internalNote: internalNote || null,
      };
      if (isEdit && editing) {
        await update(editing.id, payload);
        router.push(`/compras/gastos/${editing.id}`);
      } else {
        const created = await create(payload);
        router.push(`/compras/gastos/${created.id}`);
      }
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
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
        <Button variant="ghost" size="icon" onClick={() => router.push("/compras/gastos")} title="Volver">
          <Icon name="chevronLeft" size={14} />
        </Button>
        <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: "-0.01em" }}>
          {isEdit ? `Editar gasto ${number || ""}` : "Nuevo gasto"}
        </h1>
        <div style={{ flex: 1 }} />
        <Button variant="primary" size="sm" leftIcon={<Icon name="check" size={13} />} onClick={save} disabled={saving}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear gasto"}
        </Button>
      </div>

      <div style={{ padding: "24px 32px 80px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Cabecera */}
        <Card padding={20} style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <FormField label="Proveedor">
              <ContactAutocomplete
                value={supplierId}
                onChange={setSupplierId}
                filterTypes={["proveedor"]}
              />
            </FormField>
            <FormField label="Nº documento">
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Ej: FA-2026-001" />
            </FormField>
            <FormField label="Fecha emisión">
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </FormField>
            <FormField label="Fecha de pago">
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </FormField>
          </div>
        </Card>

        {/* Líneas */}
        <Card padding={0} style={{ overflow: "visible", marginBottom: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--beige-bg)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ ...thStyle, width: 28 }} />
                <th style={{ ...thStyle, minWidth: 220 }}>Concepto</th>
                <th style={{ ...thStyle, minWidth: 180 }}>Descripción</th>
                <th style={{ ...thStyle, width: 80, textAlign: "right" }}>Cantidad</th>
                <th style={{ ...thStyle, width: 100, textAlign: "right" }}>Precio</th>
                {hasDiscount && <th style={{ ...thStyle, width: 80, textAlign: "right" }}>Dto. %</th>}
                <th style={{ ...thStyle, width: 120 }}>IVA</th>
                <th style={{ ...thStyle, width: 100, textAlign: "right" }}>Total</th>
                <th style={{ ...thStyle, width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const subtotal = calcLineSubtotal(line);
                return (
                  <tr key={line.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ ...tdCell, color: "var(--text-faint)", fontSize: 11, textAlign: "center" }}>{idx + 1}</td>
                    <td style={tdCell}>
                      <input
                        value={line.concept}
                        onChange={(e) => updateLine(line.id, { concept: e.target.value })}
                        placeholder="Ej: Suscripción mensual, Viaje, Nómina…"
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
                      <select
                        value={line.vat}
                        onChange={(e) => updateLine(line.id, { vat: Number(e.target.value) })}
                        style={{ ...borderlessInputStyle, paddingRight: 8 }}
                      >
                        {[0, 4, 10, 21].map((v) => (
                          <option key={v} value={v}>{v === 0 ? "Sin IVA" : `IVA ${v}%`}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...tdCell, textAlign: "right", fontWeight: 500, paddingRight: 12 }}>
                      {subtotal.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                    <td style={{ ...tdCell, textAlign: "center", width: 40 }}>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 1}
                        style={{ color: "var(--text-faint)", padding: 4, opacity: lines.length <= 1 ? 0.3 : 1 }}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                <span>{totals.base.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>IVA soportado</span>
                <span>{totals.vat.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--border)", fontWeight: 600, fontSize: 15 }}>
                <span>Total</span>
                <span>{totals.total.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Categorización + pago + adjuntos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card padding={20}>
            <h3 style={blockTitle}>Categorización</h3>
            <FormField label="Categoría del gasto">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="expense-categories"
                placeholder="Software, Servicios profesionales…"
                style={selectStyle}
              />
              <datalist id="expense-categories">
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </FormField>
            <FormField label="Cuenta contable" style={{ marginTop: 10 }}>
              <select value={account} onChange={(e) => setAccount(e.target.value)} style={selectStyle}>
                {EXPENSE_ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </FormField>
            <FormField label="Etiquetas" style={{ marginTop: 10 }}>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="tags separadas por coma" />
            </FormField>
            <FormField label="Nota interna" style={{ marginTop: 10 }}>
              <AutoResizeTextarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Contexto para el equipo"
                minRows={2}
                style={textareaStyle}
              />
            </FormField>
          </Card>

          <Card padding={20}>
            <h3 style={blockTitle}>Pago y estado</h3>
            <FormField label="Método de pago">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PurchasePaymentMethod)}
                style={selectStyle}
              >
                {PAYMENT_METHODS_PURCHASE.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Estado" style={{ marginTop: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {(["borrador", "pendiente", "pagada", "vencida"] as PurchaseStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    style={{
                      padding: "6px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
                      border: "1px solid var(--border)",
                      background: status === s ? "var(--black)" : "var(--surface)",
                      color: status === s ? "#fff" : "var(--text)",
                      textTransform: "capitalize",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </FormField>

            <h3 style={{ ...blockTitle, marginTop: 20 }}>Archivos adjuntos</h3>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "1.5px dashed var(--border-strong)",
                borderRadius: 8, padding: "18px 14px", textAlign: "center",
                background: "var(--beige-bg)",
                cursor: "pointer", fontSize: 12.5, color: "var(--text-muted)",
              }}
            >
              Haz clic o arrastra una factura (PDF, imagen)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
            />
            {files.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {files.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, fontSize: 12,
                      padding: "6px 10px", borderRadius: 6, background: "var(--beige-bg)",
                    }}
                  >
                    <Icon name="paperclip" size={12} style={{ color: "var(--text-muted)" }} />
                    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{Math.round(f.size / 1024)} KB</span>
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ color: "var(--text-faint)" }}>
                      <Icon name="x" size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {err && (
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--error)", background: "#F5E1E1", padding: "10px 14px", borderRadius: 8 }}>
            {err}
          </div>
        )}
      </div>
    </div>
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
  fontFamily: "inherit",
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
  fontFamily: "inherit", resize: "none", lineHeight: 1.4,
};

const blockTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, margin: "0 0 12px",
};
