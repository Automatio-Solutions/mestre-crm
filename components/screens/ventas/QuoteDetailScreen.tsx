"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, Card, Badge, EmptyState, Dropdown, DropdownItem, DropdownSeparator, useConfirm } from "@/components/ui";
import { Field } from "@/components/screens/contactos";
import { useContacts } from "@/lib/db/useContacts";
import { useQuotes } from "@/lib/db/useQuotes";
import { QuoteDocument } from "./QuoteDocument";
import { QuotePreviewModal } from "./QuotePreviewModal";
import { generateQuotePdf } from "@/lib/pdf/generateQuotePdf";
import * as D from "@/lib/data";

export function QuoteDetailScreen({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { contacts } = useContacts();
  const { quotes, loading, moveToStatus, remove, duplicate } = useQuotes();
  const q = quotes.find((x) => x.id === quoteId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const hiddenDocRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Cargando presupuesto…</div>;
  }

  if (!q) {
    return (
      <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
        <Button variant="ghost" leftIcon={<Icon name="chevronLeft" size={14} />} onClick={() => router.push("/ventas/presupuestos")}>
          Volver
        </Button>
        <EmptyState icon={<Icon name="tag" size={28} />} title="Presupuesto no encontrado" />
      </div>
    );
  }

  const cli = contacts.find((c) => c.id === q.clientId);
  const owner = D.userById(q.owner);
  const st = D.QUOTE_STATUSES.find((s: any) => s.id === q.status);

  const events = [
    { icon: "edit", text: "Presupuesto creado", when: q.issueDate, color: "var(--text-muted)" },
    { icon: "mail", text: `Enviado a ${cli?.email || cli?.name || ""}`, when: new Date(q.issueDate.getTime() + 5 * 3600000), color: "var(--purple)" },
    ...(q.viewed
      ? [{ icon: "eye", text: "Visto por el cliente", when: new Date(q.issueDate.getTime() + 2 * 86400000), color: "var(--text-muted)" }]
      : []),
    ...(q.status === "negociando"
      ? [{ icon: "message", text: "Cliente solicita ajuste de alcance", when: new Date(q.issueDate.getTime() + 5 * 86400000), color: "var(--warning)" }]
      : []),
    ...(q.status === "aceptado" && q.acceptedDate
      ? [{ icon: "check", text: "Aceptado por el cliente", when: q.acceptedDate, color: "var(--success)" }]
      : []),
    ...(q.status === "rechazado" && q.rejectedDate
      ? [{ icon: "x", text: "Rechazado — presupuesto alternativo", when: q.rejectedDate, color: "var(--error)" }]
      : []),
  ];

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={() => router.push("/ventas/presupuestos")}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}
        >
          <Icon name="chevronLeft" size={12} /> Presupuestos
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>{q.concept}</h1>
            <Badge
              tone={
                q.status === "aceptado"
                  ? "success"
                  : q.status === "rechazado"
                  ? "error"
                  : q.status === "negociando"
                  ? "warning"
                  : "purple"
              }
            >
              {st?.name}
            </Badge>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {q.number} · {cli?.name} · {D.fmtDate(q.issueDate)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
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
            trigger={
              <Button variant="ghost" size="icon" title="Más">
                <Icon name="moreV" size={14} />
              </Button>
            }
          >
            <DropdownItem
              leftIcon={<Icon name="edit" size={13} />}
              onClick={() => router.push(`/ventas/presupuestos/${q.id}/editar`)}
            >
              Editar
            </DropdownItem>
            <DropdownItem
              leftIcon={<Icon name="download" size={13} />}
              onClick={async () => {
                if (!hiddenDocRef.current) return;
                setDownloadingPdf(true);
                try {
                  await generateQuotePdf(hiddenDocRef.current, q);
                } catch (e) {
                  console.error(e);
                  alert("Error generando el PDF.");
                } finally {
                  setDownloadingPdf(false);
                }
              }}
            >
              {downloadingPdf ? "Generando…" : "Descargar PDF"}
            </DropdownItem>
            <DropdownItem
              leftIcon={<Icon name="fileText" size={13} />}
              onClick={async () => {
                const dup = await duplicate(q.id);
                router.push(`/ventas/presupuestos/${dup.id}/editar`);
              }}
            >
              Duplicar
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              danger
              leftIcon={<Icon name="trash" size={13} />}
              onClick={async () => {
                const ok = await confirm({
                  title: "Eliminar presupuesto",
                  message: `¿Seguro que quieres eliminar el presupuesto ${q.number}?`,
                  danger: true,
                });
                if (!ok) return;
                await remove(q.id);
                router.push("/ventas/presupuestos");
              }}
            >
              Eliminar
            </DropdownItem>
          </Dropdown>
          {q.status !== "aceptado" && q.status !== "rechazado" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => moveToStatus(q.id, "rechazado")}
              >
                Marcar rechazado
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Icon name="check" size={13} />}
                onClick={() => moveToStatus(q.id, "aceptado")}
              >
                Marcar aceptado
              </Button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>
        <div>
          <Card padding={24} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={sectionHeader}>Importe</div>
                <div style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.02em" }}>
                  {q.amount.toLocaleString("es-ES", { useGrouping: "always" as any })} €
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Base imponible · + 21% IVA = {(q.amount * 1.21).toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2 })} €
                </div>
              </div>
              {!["aceptado", "rechazado"].includes(q.status) && (
                <div style={{ textAlign: "right" }}>
                  <div style={sectionHeader}>Probabilidad</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 80, height: 6, borderRadius: 3, background: "var(--beige-bg)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: q.probability + "%",
                          height: "100%",
                          background:
                            q.probability > 60
                              ? "var(--success)"
                              : q.probability > 40
                              ? "var(--warning)"
                              : "var(--text-muted)",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 500 }}>{q.probability}%</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    Ponderado: <b style={{ }}>
                      {Math.round((q.amount * q.probability) / 100).toLocaleString("es-ES", { useGrouping: "always" as any })} €
                    </b>
                  </div>
                </div>
              )}
            </div>

            <div style={sectionHeader}>Alcance propuesto</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              {[
                "Análisis inicial y briefing · 2 sesiones de 90 min",
                "Investigación de referentes y moodboard",
                "Propuesta de dirección creativa (3 rutas)",
                "Desarrollo completo del sistema visual",
                "Entregables finales + guía de uso",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <Icon name="check" size={13} style={{ color: "var(--success)", marginTop: 3, flexShrink: 0 }} />
                  <span>{line}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <MiniField label="Duración" value="4–6 semanas" />
              <MiniField label="Pago" value="50% / 50%" />
              <MiniField label="Validez" value={`Hasta ${D.fmtShort(q.expireDate)}`} />
            </div>
          </Card>

          <Card padding={18}>
            <div style={sectionHeader}>Actividad</div>
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
            </div>
          </Card>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card padding={18}>
            <div style={sectionHeader}>Detalles</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field icon="building" label="Cliente" value={cli?.name || "—"} />
              <Field icon="calendar" label="Emisión" value={D.fmtDate(q.issueDate)} />
              <Field icon="clock" label="Expiración" value={D.fmtDate(q.expireDate)} />
              <Field icon="user" label="Responsable" value={owner?.name || "—"} />
              <Field icon="tag" label="Origen" value={q.source || "Referencia"} />
            </div>
          </Card>

          {cli && (
            <Card padding={18}>
              <div style={sectionHeader}>Cliente</div>
              <div
                style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--beige-bg)", borderRadius: 8, cursor: "pointer" }}
                onClick={() => router.push(`/contactos/${cli.id}`)}
              >
                <div style={{ width: 34, height: 34, borderRadius: 7, background: "var(--beige)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
                  {cli.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{cli.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{cli.email}</div>
                </div>
                <Icon name="chevronRight" size={13} style={{ color: "var(--text-faint)" }} />
              </div>
            </Card>
          )}

          <Card padding={18}>
            <div style={sectionHeader}>Nota interna</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.5 }}>
              {q.internalNote || "Sin notas. Añade contexto para el equipo sobre este presupuesto."}
            </div>
          </Card>
        </aside>
      </div>

      {/* Modal vista previa */}
      <QuotePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        quote={q}
        client={cli || null}
      />

      {/* Documento oculto para generar PDF */}
      <div
        aria-hidden
        style={{ position: "fixed", top: 0, left: -10000, opacity: 0, pointerEvents: "none" }}
      >
        <QuoteDocument ref={hiddenDocRef} quote={q} client={cli || null} />
      </div>
    </div>
  );
}

const sectionHeader: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 12,
};

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{value}</div>
    </div>
  );
}
