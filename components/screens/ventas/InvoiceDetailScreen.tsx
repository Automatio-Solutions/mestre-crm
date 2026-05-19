"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, Card, Badge, EmptyState, Avatar, Dropdown, DropdownItem, DropdownSeparator, useConfirm } from "@/components/ui";
import { Th, Td, Field } from "@/components/screens/contactos";
import { useInvoices } from "@/lib/db/useInvoices";
import { useContacts } from "@/lib/db/useContacts";
import { InvoiceDocument } from "./InvoiceDocument";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import { generateInvoicePdf } from "@/lib/pdf/generateInvoicePdf";
import { COMPANY } from "@/lib/company";
import { useJournalEntries } from "@/lib/db/useJournalEntries";
import { buildInvoicePosting } from "@/lib/accounting/postings";
import * as D from "@/lib/data";

const statusTone: Record<string, any> = {
  pagada: "success", pendiente: "warning", vencida: "error", borrador: "outline", enviada: "purple",
};

type AsideTab = "general" | "notas" | "historial";

export function InvoiceDetailScreen({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { invoices, loading, update, remove, duplicate, create } = useInvoices();
  const { contacts } = useContacts();
  const { entries: journalEntries, create: createJournalEntry, remove: removeJournalEntry } = useJournalEntries();

  const inv = invoices.find((x) => x.id === invoiceId);
  const cli = inv ? contacts.find((c) => c.id === inv.clientId) : null;

  const [asideTab, setAsideTab] = useState<AsideTab>("general");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [posting, setPosting] = useState(false);
  const hiddenDocRef = useRef<HTMLDivElement>(null);

  // ---- Notas internas (editor) ----
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  useEffect(() => {
    setNoteDraft(inv?.internalNote || "");
  }, [inv?.id, inv?.internalNote]);

  const handleDownloadPdf = async () => {
    if (!hiddenDocRef.current || !inv) return;
    setDownloadingPdf(true);
    try {
      await generateInvoicePdf(hiddenDocRef.current, inv);
    } catch (e) {
      console.error(e);
      alert("Error generando el PDF. Revisa la consola.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Cargando factura…</div>;
  }
  if (!inv) {
    return (
      <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
        <Button variant="ghost" leftIcon={<Icon name="chevronLeft" size={14} />} onClick={() => router.push("/ventas/facturas")}>
          Volver
        </Button>
        <EmptyState icon={<Icon name="fileText" size={28} />} title="Factura no encontrada" description={`No existe ${invoiceId}.`} />
      </div>
    );
  }

  // Líneas: primero las guardadas en la factura (Supabase), si no existen, el mock, y si no, una sintética
  const lines = (inv.lines && inv.lines.length > 0)
    ? inv.lines
    : ((D.INVOICE_LINES as any)[inv.id] || [
        { description: inv.concept || "—", quantity: 1, price: inv.base, vat: 21 },
      ]);
  const activity = ((D.INVOICE_ACTIVITY as any)[inv.id] || []) as any[];
  const payments = ((D.INVOICE_PAYMENTS as any)[inv.id] || []) as any[];
  const totalUnits = lines.reduce((s: number, l: any) => s + (l.quantity || 0), 0);
  const paid = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const pending = Math.max(0, inv.total - paid);

  // Timeline events derivados del estado
  const events = [
    { icon: "edit", text: "Factura creada", when: inv.issueDate, color: "var(--text-muted)" },
    ...(inv.status !== "borrador"
      ? [{ icon: "mail", text: `Enviada a ${cli?.email || cli?.name || ""}`, when: new Date(inv.issueDate.getTime() + 3 * 3600000), color: "var(--purple)" }]
      : []),
    ...payments.map((p: any) => ({
      icon: "check", text: `Cobro de ${p.amount.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR" })} por ${p.method}`,
      when: p.date, color: "var(--success)",
    })),
    ...(inv.status === "pagada"
      ? [{ icon: "check", text: "Marcada como pagada", when: new Date((inv.dueDate?.getTime() || inv.issueDate.getTime()) - 2 * 86400000), color: "var(--success)" }]
      : []),
    ...(inv.status === "vencida" && inv.dueDate
      ? [{ icon: "alert", text: `Vencida hace ${Math.round((D.TODAY.getTime() - inv.dueDate.getTime()) / 86400000)} días`, when: inv.dueDate, color: "var(--error)" }]
      : []),
  ];

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Anular factura",
      message: `¿Seguro que quieres anular la factura ${inv.number}? Esta acción no se puede deshacer.`,
      danger: true,
    });
    if (!ok) return;
    await remove(inv.id);
    router.push("/ventas/facturas");
  };

  const handleDuplicate = async () => {
    if (!inv) return;
    try {
      const dup = await duplicate(inv.id);
      router.push(`/ventas/facturas/${dup.id}/editar`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error duplicando la factura");
    }
  };

  // Crea una factura rectificativa: misma estructura pero con importes
  // negativos (reverso completo). El número lleva prefijo "R-".
  // El usuario aterriza en el editor para ajustarla si quiere una
  // rectificativa parcial.
  const handleCreateRectificative = async () => {
    if (!inv) return;
    const ok = await confirm({
      title: "Crear factura rectificativa",
      message: `Se generará una factura rectificativa con importes negativos (reverso completo) de ${inv.number}. La factura original no se modifica. Podrás editarla antes de aprobar.`,
    });
    if (!ok) return;
    try {
      const year = new Date().getFullYear();
      const rand = Math.floor(Math.random() * 999).toString().padStart(3, "0");
      const rectNumber = `R-${year}/${rand}`;
      const negLines = (inv.lines || []).map((l) => ({
        ...l,
        id: `l-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}-${l.id}`,
        quantity: -Math.abs(l.quantity || 0),
      }));
      const created = await create({
        number: rectNumber,
        clientId: inv.clientId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000),
        base: -Math.abs(inv.base),
        vatPct: inv.vatPct,
        total: -Math.abs(inv.total),
        status: "borrador",
        concept: `Rectificativa de ${inv.number}${inv.concept ? ` · ${inv.concept}` : ""}`,
        lines: negLines,
        paymentMethod: inv.paymentMethod,
        paymentNotes: inv.paymentNotes,
        account: inv.account,
        accountByConcept: inv.accountByConcept,
        internalNote: `Rectificativa de la factura ${inv.number}.`,
        tags: ["rectificativa", ...(inv.tags || [])],
        showCustomFields: inv.showCustomFields,
        docText: inv.docText,
        docFooterMessage: inv.docFooterMessage,
      });
      router.push(`/ventas/facturas/${created.id}/editar`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error creando la rectificativa");
    }
  };

  // ----- Asiento contable enlazado -----
  const existingPosting = inv
    ? journalEntries.find((e) => e.sourceType === "invoice" && e.sourceId === inv.id)
    : null;

  const handlePost = async () => {
    if (!inv || existingPosting) return;
    setPosting(true);
    try {
      await createJournalEntry(buildInvoicePosting(inv, cli?.name));
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error generando el asiento. Revisa que las cuentas 430, 705 y 477 existan en el Cuadro de cuentas.");
    } finally {
      setPosting(false);
    }
  };

  const handleUnpost = async () => {
    if (!existingPosting) return;
    const ok = await confirm({
      title: "Eliminar asiento",
      message: `Se borrará el asiento ${existingPosting.number} del Libro Diario. La factura no se modifica.`,
      danger: true,
    });
    if (!ok) return;
    await removeJournalEntry(existingPosting.id);
  };

  const handleSaveNote = async () => {
    if (!inv) return;
    setNoteSaving(true);
    try {
      await update(inv.id, { internalNote: noteDraft.trim() || null });
    } catch (e: any) {
      alert(e?.message || "Error guardando la nota");
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <div style={{ padding: "24px 32px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* ============ Top header ============ */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Button variant="ghost" size="icon" onClick={() => router.push("/ventas/facturas")} title="Cerrar">
          <Icon name="close" size={14} />
        </Button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <h1 style={{
              fontSize: 16, fontWeight: 500, margin: 0, letterSpacing: "-0.01em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {cli?.name || "—"} · Factura {inv.number}
            </h1>
            <Badge tone={statusTone[inv.status]}>
              <Icon name="lock" size={10} style={{ marginRight: 4 }} />
              Documento {inv.status}
            </Badge>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Dropdown
            align="end"
            trigger={<Button variant="ghost" size="icon" title="Más"><Icon name="moreV" size={14} /></Button>}
          >
            <DropdownItem
              leftIcon={<Icon name="eye" size={13} />}
              onClick={() => setPreviewOpen(true)}
            >
              Vista previa
            </DropdownItem>
            <DropdownItem
              leftIcon={<Icon name="edit" size={13} />}
              onClick={() => router.push(`/ventas/facturas/${inv.id}/editar`)}
            >
              Editar
            </DropdownItem>
            <DropdownItem
              leftIcon={<Icon name="download" size={13} />}
              onClick={handleDownloadPdf}
            >
              {downloadingPdf ? "Generando…" : "Descargar PDF"}
            </DropdownItem>
            <DropdownItem leftIcon={<Icon name="fileText" size={13} />} onClick={handleDuplicate}>
              Duplicar
            </DropdownItem>
            <DropdownItem leftIcon={<Icon name="refresh" size={13} />} onClick={handleCreateRectificative}>
              Crear rectificativa
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem danger leftIcon={<Icon name="trash" size={13} />} onClick={handleDelete}>
              Anular factura
            </DropdownItem>
          </Dropdown>
          {inv.status === "borrador" && (
            <Button variant="primary" size="sm" leftIcon={<Icon name="mail" size={13} />} onClick={() => update(inv.id, { status: "enviada" })}>
              Enviar
            </Button>
          )}
          {(inv.status === "pendiente" || inv.status === "vencida" || inv.status === "enviada") && (
            <Button variant="primary" size="sm" leftIcon={<Icon name="check" size={13} />} onClick={() => update(inv.id, { status: "pagada" })}>
              Marcar cobrada
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 18 }}>
        {/* ============ LEFT: preview + lines + activity ============ */}
        <div>
          <Card padding={0} style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{ background: "var(--beige-bg)", padding: 32, display: "flex", justifyContent: "center" }}>
              <InvoicePreview inv={inv} cli={cli} lines={lines} />
            </div>
          </Card>

          <Card padding={0} style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Líneas de factura</div>
              <button style={{ fontSize: 11.5, color: "var(--purple)", fontWeight: 500 }}>+ Añadir línea</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--beige-bg)" }}>
                  <Th>Descripción</Th>
                  <Th align="right">Cant.</Th>
                  <Th align="right">Precio</Th>
                  <Th align="right">IVA</Th>
                  <Th align="right">Subtotal</Th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l: any, i: number) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td>{l.description}</Td>
                    <Td align="right" mono>{l.quantity}</Td>
                    <Td align="right" mono>{l.price.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Td>
                    <Td align="right" mono muted>{l.vat}%</Td>
                    <Td align="right" mono style={{ fontWeight: 500 }}>{(l.quantity * l.price).toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* ============ RIGHT aside con tabs ============ */}
        <aside>
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
            {([
              { id: "general", label: "General" },
              { id: "notas", label: "Notas" },
              { id: "historial", label: "Historial" },
            ] as const).map((t) => {
              const active = asideTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setAsideTab(t.id)}
                  style={{
                    flex: 1, padding: "10px 8px", fontSize: 12.5, fontWeight: active ? 500 : 450,
                    background: "transparent",
                    color: active ? "var(--text)" : "var(--text-muted)",
                    borderBottom: active ? "2px solid var(--text)" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {asideTab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Total + resumen */}
              <Card padding={18}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Total</span>
                  <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
                    {inv.total.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", minimumFractionDigits: 2 })}
                  </span>
                </div>
                <SummaryRow label="Número de documento" value={<span style={{ }}>{inv.number}</span>} />
                <SummaryRow
                  label="Contacto"
                  value={
                    cli ? (
                      <button
                        onClick={() => router.push(`/contactos/${cli.id}`)}
                        style={{ color: "var(--purple)", fontWeight: 500, textAlign: "right" }}
                      >
                        {cli.name}
                      </button>
                    ) : "—"
                  }
                />
                <SummaryRow label="Fecha" value={D.fmtShort(inv.issueDate)} />
                <SummaryRow
                  label="Vencimiento"
                  value={inv.dueDate ? (
                    <span style={{ color: "var(--purple)" }}>{D.fmtShort(inv.dueDate)}</span>
                  ) : "—"}
                />
                <SummaryRow label="Total unidades" value={totalUnits} last />
              </Card>

              {/* Pagos */}
              <Card padding={18}>
                <SectionHeader
                  title="Pagos"
                  action={
                    <button style={linkBtn}>
                      <Icon name="plus" size={12} /> Añadir pago
                    </button>
                  }
                />
                {payments.length > 0 ? (
                  <>
                    {payments.map((p: any) => (
                      <div key={p.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 0", fontSize: 12.5, borderTop: "1px solid var(--border)",
                      }}>
                        <div>
                          <div>{p.method}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{D.fmtShort(p.date)} · {p.ref}</div>
                        </div>
                        <span style={{ color: "var(--success)", fontWeight: 500 }}>
                          {p.amount.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR" })}
                        </span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 4, borderTop: "1px solid var(--border)", fontSize: 12.5, fontWeight: 500 }}>
                      <span>Cobrado</span>
                      <span style={{ color: "var(--success)" }}>
                        {paid.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR" })}
                      </span>
                    </div>
                  </>
                ) : null}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "10px 0 0", marginTop: payments.length > 0 ? 0 : 4,
                  borderTop: payments.length > 0 ? "none" : "1px solid var(--border)",
                  fontSize: 12.5, fontWeight: 500,
                }}>
                  <span>Pendiente de pago</span>
                  <span style={{ color: pending > 0 ? "var(--warning)" : "var(--text-muted)" }}>
                    {pending.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR" })}
                  </span>
                </div>
              </Card>

              {/* Vencimiento */}
              <Card padding={18}>
                <SectionHeader title="Vencimiento" action={<button style={linkBtn}>Editar</button>} />
                <SummaryRow label="Fecha" value={inv.dueDate ? D.fmtShort(inv.dueDate) : "—"} last />
                {inv.status === "vencida" && inv.dueDate && (
                  <div style={inlineAlert("error")}>
                    <Icon name="alert" size={12} />
                    Vencida hace {Math.round((D.TODAY.getTime() - inv.dueDate.getTime()) / 86400000)} días
                  </div>
                )}
                {inv.status === "pendiente" && inv.dueDate && inv.dueDate >= D.TODAY && (
                  <div style={inlineAlert("warning")}>
                    <Icon name="clock" size={12} />
                    Vence en {Math.max(0, Math.round((inv.dueDate.getTime() - D.TODAY.getTime()) / 86400000))} días
                  </div>
                )}
              </Card>

              {/* Emails */}
              <Card padding={18}>
                <SectionHeader
                  title="Emails"
                  action={
                    <button style={linkBtn}>
                      <Icon name="mail" size={12} /> Enviar vía email
                    </button>
                  }
                />
                {activity.filter((a: any) => /email|envi[aoó]/.test(a.action)).length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-faint)", padding: "4px 0" }}>Sin emails enviados todavía</div>
                ) : (
                  activity.filter((a: any) => /email|envi[aoó]/.test(a.action)).map((a: any) => (
                    <div key={a.id} style={{ padding: "8px 0", fontSize: 12, borderTop: "1px solid var(--border)" }}>
                      <div style={{ color: "var(--text)" }}>{a.action}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{D.relativeTime(a.when)}</div>
                    </div>
                  ))
                )}
              </Card>

              {/* Categorización */}
              <Card padding={18}>
                <SectionHeader
                  title="Categorización"
                  action={
                    <button
                      style={linkBtn}
                      onClick={() => router.push(`/ventas/facturas/${inv.id}/editar`)}
                    >
                      Editar
                    </button>
                  }
                />
                <SummaryRow
                  label="Método de pago"
                  value={
                    <span style={{ textTransform: "capitalize" }}>
                      {inv.paymentMethod || "—"}
                    </span>
                  }
                />
                <SummaryRow
                  label="Cuenta contable"
                  value={
                    inv.account ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
                        {inv.account}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-faint)" }}>Sin asignar</span>
                    )
                  }
                />
                <SummaryRow
                  label="Etiquetas"
                  value={
                    inv.tags && inv.tags.length > 0 ? (
                      <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {inv.tags.map((t: string) => (
                          <span key={t} style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 999,
                            background: "var(--beige-bg)", color: "var(--text)",
                          }}>{t}</span>
                        ))}
                      </span>
                    ) : <span style={{ color: "var(--text-faint)" }}>—</span>
                  }
                  last
                />
              </Card>

              {/* Archivos */}
              <Card padding={18}>
                <SectionHeader title="Archivos" action={<button style={linkBtn}>Subir archivo</button>} />
                <FileDropzone />
              </Card>

              {/* Asiento contable */}
              <Card padding={18}>
                <SectionHeader
                  title="Asiento contable"
                  action={
                    existingPosting ? (
                      <button
                        style={linkBtn}
                        onClick={() => router.push("/contabilidad/libro-diario")}
                      >
                        Ver libro
                      </button>
                    ) : null
                  }
                />
                {existingPosting ? (
                  <>
                    <SummaryRow
                      label="Nº asiento"
                      value={
                        <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 500 }}>
                          {existingPosting.number}
                        </span>
                      }
                    />
                    <SummaryRow
                      label="Fecha"
                      value={D.fmtShort(existingPosting.date)}
                    />
                    <SummaryRow
                      label="Líneas"
                      value={`${existingPosting.lines.length}`}
                      last
                    />
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Icon name="trash" size={12} />}
                        onClick={handleUnpost}
                      >
                        Eliminar asiento
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                      Aún no se ha registrado en el Libro Diario.
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Icon name="plus" size={12} />}
                      onClick={handlePost}
                      disabled={posting}
                    >
                      {posting ? "Generando…" : "Generar asiento"}
                    </Button>
                  </>
                )}
              </Card>
            </div>
          )}

          {asideTab === "notas" && (
            <Card padding={18}>
              <SectionHeader title="Notas internas" />
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10 }}>
                Notas privadas sobre esta factura. No se muestran al cliente ni se imprimen en el PDF.
              </div>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Escribe una nota interna sobre esta factura…"
                style={{
                  width: "100%", minHeight: 160, padding: "10px 12px", fontSize: 13,
                  border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)",
                  fontFamily: "inherit", resize: "vertical", lineHeight: 1.45,
                }}
              />
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: 8, gap: 8,
              }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {noteDraft === (inv.internalNote || "")
                    ? (inv.internalNote ? "Guardado" : "Sin nota")
                    : "Cambios sin guardar"}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Icon name="check" size={12} />}
                  disabled={noteSaving || noteDraft === (inv.internalNote || "")}
                  onClick={handleSaveNote}
                >
                  {noteSaving ? "Guardando…" : "Guardar nota"}
                </Button>
              </div>
            </Card>
          )}

          {asideTab === "historial" && (
            <Card padding={18}>
              <SectionHeader title="Historial" />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative", paddingLeft: 18 }}>
                <div style={{ position: "absolute", left: 5, top: 4, bottom: 4, width: 1, background: "var(--border)" }} />
                {events.map((ev, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, position: "relative" }}>
                    <div style={{ position: "absolute", left: -18, top: 2, width: 12, height: 12, borderRadius: "50%", background: "var(--surface)", border: `2px solid ${ev.color}`, boxShadow: "0 0 0 3px var(--surface)" }} />
                    <Icon name={ev.icon} size={13} style={{ color: ev.color, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5 }}>{ev.text}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {D.relativeTime(ev.when)} · {D.fmtDate(ev.when)}
                      </div>
                    </div>
                  </div>
                ))}
                {activity.map((a: any) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, position: "relative" }}>
                    <div style={{ position: "absolute", left: -18, top: 2, width: 12, height: 12, borderRadius: "50%", background: "var(--surface)", border: "2px solid var(--border-strong)", boxShadow: "0 0 0 3px var(--surface)" }} />
                    <Icon name="activity" size={13} style={{ color: "var(--text-muted)", marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5 }}>{a.action}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{D.relativeTime(a.when)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>

      {/* Modal de vista previa */}
      <InvoicePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        invoice={inv}
        client={cli || null}
      />

      {/* Documento oculto para generar PDF desde el menú */}
      <div
        aria-hidden
        style={{ position: "fixed", top: 0, left: -10000, opacity: 0, pointerEvents: "none" }}
      >
        <InvoiceDocument ref={hiddenDocRef} invoice={inv} client={cli || null} />
      </div>
    </div>
  );
}

// ====== Sub-components ======

function InvoicePreview({ inv, cli, lines }: { inv: any; cli: any; lines: any[] }) {
  return (
    <div style={{ background: "#fff", width: "100%", maxWidth: 560, padding: 40, boxShadow: "0 10px 36px rgba(0,0,0,0.1)", fontSize: 11, color: "#222", lineHeight: 1.6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          {COMPANY.logoUrl ? (
            <img
              src={COMPANY.logoUrl}
              alt={COMPANY.tradeName}
              style={{ height: 32, marginBottom: 10, display: "block" }}
            />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "#2A1C14", color: "#F6F1E8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 600, marginBottom: 10, fontSize: 14,
            }}>
              {COMPANY.tradeName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{COMPANY.legalName}</div>
          <div style={{ fontSize: 10, color: "#666" }}>
            {COMPANY.nif} · {COMPANY.city}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: "#111", letterSpacing: "-0.02em" }}>Factura</div>
          <div style={{ fontSize: 11, marginTop: 2 }}>{inv.number}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, padding: "14px 0", borderTop: "1px solid #e5e5e5", borderBottom: "1px solid #e5e5e5", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Cliente</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#111" }}>{cli?.name || "—"}</div>
          <div style={{ fontSize: 10, color: "#666" }}>{cli?.nif || "NIF"}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Emisión</div>
          <div style={{ fontSize: 11 }}>{D.fmtDate(inv.issueDate)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Vencimiento</div>
          <div style={{ fontSize: 11 }}>
            {inv.dueDate ? D.fmtDate(inv.dueDate) : "—"}
          </div>
        </div>
      </div>

      <table style={{ width: "100%", fontSize: 10.5, borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ddd" }}>
            <th style={thStyle}>Descripción</th>
            <th style={{ ...thStyle, textAlign: "right", width: 40 }}>Cant</th>
            <th style={{ ...thStyle, textAlign: "right", width: 70 }}>Precio</th>
            <th style={{ ...thStyle, textAlign: "right", width: 80 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l: any, i: number) => (
            <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "10px 0" }}>{l.description}</td>
              <td style={{ padding: "10px 0", textAlign: "right" }}>{l.quantity}</td>
              <td style={{ padding: "10px 0", textAlign: "right" }}>{l.price.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
              <td style={{ padding: "10px 0", textAlign: "right" }}>
                {(l.quantity * l.price).toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 200, fontSize: 10.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span style={{ color: "#666" }}>Base imponible</span>
            <span style={{ }}>{inv.base.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span style={{ color: "#666" }}>IVA {inv.vatPct}%</span>
            <span style={{ }}>{(inv.total - inv.base).toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 6, borderTop: "1px solid #222", fontSize: 13, fontWeight: 700 }}>
            <span>TOTAL</span>
            <span style={{ }}>{inv.total.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, paddingTop: 14, borderTop: "1px solid #e5e5e5", fontSize: 9.5, color: "#888", display: "flex", justifyContent: "space-between" }}>
        <div>Transferencia a {COMPANY.iban}</div>
        {inv.dueDate && <div>Vence el {D.fmtDate(inv.dueDate)}</div>}
      </div>
    </div>
  );
}

function FileDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          const fs = Array.from(e.dataTransfer.files);
          setFiles((prev) => [...prev, ...fs]);
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: "1.5px dashed " + (dragOver ? "var(--purple)" : "var(--border-strong)"),
          borderRadius: 8, padding: "18px 14px", textAlign: "center",
          background: dragOver ? "var(--purple-soft)" : "var(--beige-bg)",
          cursor: "pointer", fontSize: 12.5, color: "var(--text-muted)",
          transition: "all 160ms ease",
        }}
      >
        Haz clic o arrastra un archivo
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const fs = Array.from(e.target.files || []);
          setFiles((prev) => [...prev, ...fs]);
        }}
      />
      {files.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {files.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 12, padding: "6px 10px", borderRadius: 6,
                background: "var(--beige-bg)",
              }}
            >
              <Icon name="paperclip" size={12} style={{ color: "var(--text-muted)" }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{Math.round(f.size / 1024)} KB</span>
              <button
                onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, j) => j !== i)); }}
                style={{ color: "var(--text-faint)" }}
              >
                <Icon name="x" size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
      {action}
    </div>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", fontSize: 12.5,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const inlineAlert = (tone: "error" | "warning"): React.CSSProperties => ({
  marginTop: 10,
  padding: "8px 10px",
  borderRadius: 6,
  fontSize: 11.5,
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: tone === "error" ? "#F5E1E1" : "#FAF1DC",
  color: tone === "error" ? "var(--error)" : "#8C6A1E",
});

const linkBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12,
  fontWeight: 500,
  color: "var(--purple)",
  background: "transparent",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 0",
  fontWeight: 600,
  color: "#888",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 9,
};
