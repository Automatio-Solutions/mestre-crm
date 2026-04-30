"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, Card, Badge, TagPill, EmptyState, useConfirm } from "@/components/ui";
import { useContacts } from "@/lib/db/useContacts";
import { useInvoices } from "@/lib/db/useInvoices";
import { ContactActionsBar, buildContactActions } from "./contact-actions";
import { ContactSalesChart, ContactSalesKpis } from "./contact-sales";
import { ContactFormModal } from "./contactos";
import * as D from "@/lib/data";

export function ContactDetailPage({ contactId }: { contactId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { contacts, loading, update, remove } = useContacts();
  const { invoices: allInvoices, loading: invLoading } = useInvoices();

  const contact = contacts.find((c) => c.id === contactId);
  const contactInvoices = useMemo(
    () => allInvoices.filter((i) => i.clientId === contactId),
    [allInvoices, contactId]
  );

  const [editing, setEditing] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    contactInvoices.forEach((i) => set.add(i.issueDate.getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [contactInvoices]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Cargando contacto…</div>;
  }
  if (!contact) {
    return (
      <div style={{ padding: 40 }}>
        <EmptyState
          icon={<Icon name="users" size={28} />}
          title="Contacto no encontrado"
          description="El contacto que buscas no existe o ha sido eliminado."
          action={
            <Button variant="primary" onClick={() => router.push("/contactos")}>
              Volver a contactos
            </Button>
          }
        />
      </div>
    );
  }

  const actions = buildContactActions(contact);

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Eliminar contacto",
      message: `¿Seguro que quieres eliminar "${contact.name}"? Esta acción no se puede deshacer.`,
      danger: true,
    });
    if (!ok) return;
    await remove(contact.id);
    router.push("/contactos");
  };

  return (
    <div style={{ padding: "24px 32px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Breadcrumb + acciones */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="chevronLeft" size={13} />}
          onClick={() => router.push("/contactos")}
        >
          Contactos
        </Button>
        <div style={{ flex: 1 }} />
        <Button variant="outline" size="sm" leftIcon={<Icon name="edit" size={13} />} onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button variant="ghost" size="sm" leftIcon={<Icon name="trash" size={13} />} onClick={handleDelete}>
          Eliminar
        </Button>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 24 }}>
        <div
          style={{
            width: 64, height: 64, borderRadius: 14,
            background: "var(--beige)", color: "var(--text)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 600, flexShrink: 0,
          }}
        >
          {contact.name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <h1
              style={{
                margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em",
              }}
            >
              {contact.name}
            </h1>
            <Badge tone={contact.type === "lead" ? "purple" : contact.type === "proveedor" ? "outline" : "neutral"}>
              {contact.type}
            </Badge>
            {contact.status && contact.status !== contact.type && (
              <Badge tone={contact.status === "activo" ? "success" : "outline"}>
                {contact.status}
              </Badge>
            )}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            {contact.nif && <span style={{ }}>NIF: {contact.nif}</span>}
            {contact.city && <span>{contact.city}</span>}
            {contact.lastInteraction && (
              <span>Última interacción: {D.relativeTime(contact.lastInteraction)}</span>
            )}
          </div>
          {contact.tags.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
              {contact.tags.map((t) => <TagPill key={t} tag={t} />)}
            </div>
          )}
        </div>
      </div>

      {/* Barra de acciones */}
      <div style={{ marginBottom: 24 }}>
        <ContactActionsBar actions={actions} />
      </div>

      {/* Layout 2 columnas */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: 20 }}>
        {/* Columna izquierda */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ContactSalesKpis invoices={contactInvoices} />
          <ContactSalesChart
            invoices={contactInvoices}
            year={year}
            onChangeYear={setYear}
            availableYears={availableYears}
          />
          <Card padding={20}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Facturas ({contactInvoices.length})</div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="plus" size={13} />}
                onClick={() => router.push("/ventas/facturas")}
              >
                Nueva factura
              </Button>
            </div>
            {invLoading ? (
              <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}>Cargando…</div>
            ) : contactInvoices.length === 0 ? (
              <EmptyState
                icon={<Icon name="receipt" size={28} />}
                title="Sin facturas"
                description="Este contacto no tiene facturas aún."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {contactInvoices.slice(0, 10).map((inv, i) => (
                  <div
                    key={inv.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                      borderBottom: i < Math.min(contactInvoices.length, 10) - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <Icon name="fileText" size={16} style={{ color: "var(--text-muted)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{inv.number}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                        {D.fmtDate(inv.issueDate)} · {inv.concept || "—"}
                      </div>
                    </div>
                    <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                      {inv.total.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR" })}
                    </div>
                    <Badge
                      tone={
                        inv.status === "pagada" ? "success"
                        : inv.status === "vencida" ? "error"
                        : inv.status === "borrador" ? "outline"
                        : "warning"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Columna derecha */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card padding={20}>
            <SectionTitle>Información del contacto</SectionTitle>
            <InfoRow label="Email" value={contact.email} />
            <InfoRow label="Teléfono" value={contact.phone} />
            <InfoRow label="Web" value={contact.website} />
          </Card>

          <Card padding={20}>
            <SectionTitle>Dirección</SectionTitle>
            <InfoRow label="Calle" value={contact.address} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <InfoRow label="C.P." value={contact.postalCode} />
              <InfoRow label="Ciudad" value={contact.city} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <InfoRow label="Provincia" value={contact.province} />
              <InfoRow label="País" value={contact.country} />
            </div>
          </Card>

          <Card padding={20}>
            <SectionTitle>Crear nuevo</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <CreateTile icon="edit" label="Nota" />
              <CreateTile icon="fileText" label="Presupuesto" />
              <CreateTile icon="receipt" label="Factura" onClick={() => router.push("/ventas/facturas")} />
              <CreateTile icon="activity" label="Actividad" />
            </div>
          </Card>
        </div>
      </div>

      <ContactFormModal
        open={editing}
        onClose={() => setEditing(false)}
        initial={contact}
        onSubmit={async (values) => {
          await update(contact.id, values as any);
          setEditing(false);
        }}
      />
    </div>
  );
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: "0.08em",
      marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid var(--border)",
    }}
  >
    {children}
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div
    style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      gap: 12, padding: "8px 0", fontSize: 13,
    }}
  >
    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{label}</span>
    <span style={{ fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}>
      {value || <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>—</span>}
    </span>
  </div>
);

const CreateTile = ({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    style={{
      display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
      border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5,
      background: "var(--surface)", color: "var(--text)",
      cursor: onClick ? "pointer" : "not-allowed",
      opacity: onClick ? 1 : 0.55, textAlign: "left",
    }}
    onMouseEnter={(e) => {
      if (!onClick) return;
      e.currentTarget.style.background = "var(--beige-bg)";
      e.currentTarget.style.borderColor = "var(--border-strong)";
    }}
    onMouseLeave={(e) => {
      if (!onClick) return;
      e.currentTarget.style.background = "var(--surface)";
      e.currentTarget.style.borderColor = "var(--border)";
    }}
  >
    <Icon name={icon} size={14} style={{ color: "var(--text-muted)" }} />
    <span>{label}</span>
  </button>
);
