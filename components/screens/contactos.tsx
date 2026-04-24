"use client";
/* @ts-nocheck */
import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import * as D from "@/lib/data";
import {
  Icon, Button, Card, Badge, Input, Tabs, Sheet, Modal,
  EmptyState, Skeleton, TagPill, useConfirm,
} from "@/components/ui";
import { useRouter } from "next/navigation";
import { useContacts } from "@/lib/db/useContacts";
import { useInvoices } from "@/lib/db/useInvoices";
import type { Contact, NewContact, ContactType } from "@/lib/db/contacts";
import { ContactActionsBar, buildContactActions } from "./contact-actions";

const statusTone: Record<string, "success" | "outline" | "purple" | "neutral"> = {
  activo: "success",
  inactivo: "outline",
  lead: "purple",
};

// ============================================================
// CONTACTOS (conectado a Supabase vía useContacts)
// ============================================================
export const Contactos = ({ setRoute, initialOpen }: any) => {
  const confirm = useConfirm();
  const { contacts, loading, error, create, update, remove } = useContacts();

  const [tab, setTab] = useState("todos");
  const [search, setSearch] = useState("");
  const [openContact, setOpenContact] = useState<string | null>(initialOpen || null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  useEffect(() => {
    if (initialOpen) setOpenContact(initialOpen);
  }, [initialOpen]);

  const counts = useMemo(
    () => ({
      todos: contacts.length,
      clientes: contacts.filter((c) => c.type === "cliente").length,
      proveedores: contacts.filter((c) => c.type === "proveedor").length,
      leads: contacts.filter((c) => c.type === "lead").length,
    }),
    [contacts]
  );

  const filtered = useMemo(() => {
    let r = contacts;
    if (tab === "clientes") r = r.filter((c) => c.type === "cliente");
    if (tab === "proveedores") r = r.filter((c) => c.type === "proveedor");
    if (tab === "leads") r = r.filter((c) => c.type === "lead");
    if (search.trim()) {
      const lq = search.toLowerCase();
      r = r.filter((c) =>
        [c.name, c.nif, c.email, c.city].filter(Boolean).join(" ").toLowerCase().includes(lq)
      );
    }
    return r;
  }, [contacts, tab, search]);

  const contact = openContact ? contacts.find((c) => c.id === openContact) : null;

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c: Contact) => { setEditing(c); setFormOpen(true); };

  const handleSubmit = async (values: NewContact) => {
    if (editing) {
      await update(editing.id, values);
    } else {
      const created = await create(values);
      setOpenContact(created.id);
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    const c = contacts.find((x) => x.id === id);
    const ok = await confirm({
      title: "Eliminar contacto",
      message: c?.name
        ? `¿Seguro que quieres eliminar "${c.name}"? Esta acción no se puede deshacer.`
        : "¿Seguro que quieres eliminar este contacto? Esta acción no se puede deshacer.",
      danger: true,
    });
    if (!ok) return;
    await remove(id);
    setOpenContact(null);
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>Contactos</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>
            Base de datos de clientes, proveedores y leads
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" leftIcon={<Icon name="upload" size={14} />}>Importar CSV</Button>
          <Button variant="primary" leftIcon={<Icon name="plus" size={14} />} onClick={openNew}>
            Nuevo contacto
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "todos", label: "Todos", count: counts.todos },
            { id: "clientes", label: "Clientes", count: counts.clientes },
            { id: "proveedores", label: "Proveedores", count: counts.proveedores },
            { id: "leads", label: "Leads", count: counts.leads },
          ]}
        />
        <div style={{ flex: 1, minWidth: 260, maxWidth: 360 }}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, NIF, email…"
            leftIcon={<Icon name="search" size={14} />}
          />
        </div>
        <Button variant="outline" size="sm" leftIcon={<Icon name="filter" size={14} />}>Filtros</Button>
        <Button variant="ghost" size="sm" leftIcon={<Icon name="download" size={14} />}>Exportar</Button>
      </div>

      {error && (
        <Card style={{ marginBottom: 16, borderColor: "var(--error)", background: "#F5E1E1" }}>
          <div style={{ fontSize: 13, color: "var(--error)" }}>
            No se pudieron cargar los contactos: {error.message}
          </div>
        </Card>
      )}

      <Card padding={0} style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--beige-bg)" }}>
                <Th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(filtered.map((c) => c.id)) : new Set())
                    }
                  />
                </Th>
                <Th>Nombre</Th>
                <Th>NIF/CIF</Th>
                <Th>Email</Th>
                <Th>Ciudad</Th>
                <Th>Tags</Th>
                <Th align="right">Facturado</Th>
                <Th>Última interacción</Th>
                <Th>Estado</Th>
                <Th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonRows />}
              {!loading &&
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setOpenContact(c.id)}
                    style={{ cursor: "pointer", borderTop: "1px solid var(--border)", transition: "background 120ms" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => {
                          const s = new Set(selected);
                          s.has(c.id) ? s.delete(c.id) : s.add(c.id);
                          setSelected(s);
                        }}
                      />
                    </Td>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 28, height: 28, borderRadius: 7, background: "var(--beige)",
                            color: "var(--text)", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 11, fontWeight: 600,
                          }}
                        >
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 500 }}>{c.name}</div>
                      </div>
                    </Td>
                    <Td mono>{c.nif}</Td>
                    <Td muted>{c.email}</Td>
                    <Td>{c.city}</Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {c.tags.slice(0, 2).map((t) => <TagPill key={t} tag={t} size="sm" />)}
                        {c.tags.length > 2 && (
                          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                            +{c.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td align="right" mono>
                      {c.facturado > 0
                        ? c.facturado.toLocaleString("es-ES", { useGrouping: "always", style: "currency", currency: "EUR", maximumFractionDigits: 0 })
                        : "—"}
                    </Td>
                    <Td muted>{c.lastInteraction ? D.relativeTime(c.lastInteraction) : "—"}</Td>
                    <Td>
                      <Badge tone={statusTone[c.status || ""] || "neutral"}>{c.status}</Badge>
                    </Td>
                    <Td>
                      <button style={{ color: "var(--text-faint)", padding: 4 }}>
                        <Icon name="moreV" size={14} />
                      </button>
                    </Td>
                  </tr>
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      icon={<Icon name="users" size={28} />}
                      title={contacts.length === 0 ? "Sin contactos todavía" : "Sin resultados"}
                      description={
                        contacts.length === 0
                          ? "Añade tu primer contacto con el botón de arriba."
                          : "Prueba con otra búsqueda o filtro."
                      }
                      action={
                        contacts.length === 0 && (
                          <Button variant="primary" leftIcon={<Icon name="plus" size={14} />} onClick={openNew}>
                            Nuevo contacto
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
          <div>
            {filtered.length} contactos {selected.size > 0 && `· ${selected.size} seleccionados`}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>Filas: 50</span>
            <Button variant="ghost" size="iconSm"><Icon name="chevronLeft" size={14} /></Button>
            <span>1 / 1</span>
            <Button variant="ghost" size="iconSm"><Icon name="chevronRight" size={14} /></Button>
          </div>
        </div>
      </Card>

      <Sheet open={!!contact} onClose={() => setOpenContact(null)} width={580}>
        {contact && (
          <ContactDetail
            contact={contact}
            onClose={() => setOpenContact(null)}
            onEdit={() => openEdit(contact)}
            onDelete={() => handleDelete(contact.id)}
          />
        )}
      </Sheet>

      <ContactFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initial={editing}
      />
    </div>
  );
};

// ============================================================
// SHARED TABLE HELPERS (re-usados por ventas/compras/contabilidad)
// ============================================================
export const Th = ({ children, align = "left", style = {} }: any) => (
  <th
    style={{
      textAlign: align,
      padding: "10px 14px",
      fontSize: 11,
      fontWeight: 500,
      color: "var(--text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      borderBottom: "1px solid var(--border)",
      ...style,
    }}
  >
    {children}
  </th>
);

export const Td = ({ children, align = "left", mono, muted, style = {}, ...rest }: any) => (
  <td
    {...rest}
    style={{
      textAlign: align,
      padding: "12px 14px",
      color: muted ? "var(--text-muted)" : "var(--text)",
      // Solo preservamos tabular-nums para alinear cifras. La fuente es uniforme (inherit).
      fontVariantNumeric: mono ? "tabular-nums" : "normal",
      fontFamily: "inherit",
      fontSize: 13,
      ...style,
    }}
  >
    {children}
  </td>
);

// ============================================================
// CONTACT DETAIL (sheet lateral)
// ============================================================
const ContactDetail = ({
  contact, onClose, onEdit, onDelete,
}: {
  contact: Contact;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const router = useRouter();
  const [tab, setTab] = useState("info");
  const { invoices: allInvoices } = useInvoices();
  const invoices = allInvoices.filter((i) => i.clientId === contact.id);
  const actions = buildContactActions(contact, {
    onMore: () => { onClose(); router.push(`/contactos/${contact.id}`); },
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 10, background: "var(--beige)",
              color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 600,
            }}
          >
            {contact.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2
                style={{
                  margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
              >
                {contact.name}
              </h2>
              <Badge
                tone={
                  contact.type === "lead" ? "purple" : contact.type === "proveedor" ? "outline" : "neutral"
                }
              >
                {contact.type}
              </Badge>
            </div>
            {contact.nif && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                NIF: {contact.nif}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <Button variant="ghost" size="icon" onClick={onEdit} title="Editar">
              <Icon name="edit" size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} title="Eliminar">
              <Icon name="trash" size={14} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} title="Cerrar">
              <Icon name="close" size={14} />
            </Button>
          </div>
        </div>
        <ContactActionsBar actions={actions} size="sm" />
      </div>
      <div style={{ padding: "16px 28px", borderBottom: "1px solid var(--border)" }}>
        <Tabs
          value={tab}
          onChange={setTab}
          size="sm"
          tabs={[
            { id: "info", label: "Información" },
            { id: "facturas", label: "Facturas", count: invoices.length },
            { id: "presupuestos", label: "Presupuestos" },
            { id: "notas", label: "Notas" },
            { id: "activity", label: "Actividad" },
          ]}
        />
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
        {tab === "info" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field icon="mail" label="Email" value={contact.email || "—"} />
            <Field icon="phone" label="Teléfono" value={contact.phone || "—"} />
            <Field icon="link" label="Web" value={contact.website || "—"} />
            <Field
              icon="pin"
              label="Dirección"
              value={
                [contact.address, contact.postalCode, contact.city, contact.province, contact.country]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
            <Field
              icon="tag"
              label="Tags"
              value={
                contact.tags.length > 0 ? (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {contact.tags.map((t) => <TagPill key={t} tag={t} />)}
                  </div>
                ) : "—"
              }
            />
            <Field
              icon="euro"
              label="Facturado total"
              value={contact.facturado.toLocaleString("es-ES", { useGrouping: "always", style: "currency", currency: "EUR" })}
            />
            <Field
              icon="clock"
              label="Última interacción"
              value={contact.lastInteraction ? D.relativeTime(contact.lastInteraction) : "—"}
            />
          </div>
        )}
        {tab === "facturas" &&
          (invoices.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {invoices.map((inv: any) => (
                <div
                  key={inv.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: 12, border: "1px solid var(--border)", borderRadius: 8,
                  }}
                >
                  <Icon name="fileText" size={18} style={{ color: "var(--text-muted)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{inv.number}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {D.fmtDate(inv.issueDate)} · {inv.concept}
                    </div>
                  </div>
                  <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                    {inv.total.toLocaleString("es-ES", { useGrouping: "always", style: "currency", currency: "EUR" })}
                  </div>
                  <Badge
                    tone={
                      inv.status === "pagada"
                        ? "success"
                        : inv.status === "vencida"
                        ? "error"
                        : inv.status === "borrador"
                        ? "outline"
                        : "warning"
                    }
                  >
                    {inv.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Icon name="receipt" size={28} />}
              title="Sin facturas"
              description="Este contacto no tiene facturas aún."
            />
          ))}
        {tab === "presupuestos" && (
          <EmptyState title="Sin presupuestos" description="No hay presupuestos creados para este contacto." />
        )}
        {tab === "notas" && (
          <EmptyState title="Sin notas" description="Añade notas privadas sobre este contacto." />
        )}
        {tab === "activity" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { action: "Contacto creado", when: contact.lastInteraction },
            ].map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex", gap: 12, padding: "12px 0",
                  borderBottom: i < 0 ? "1px solid var(--border)" : "none",
                }}
              >
                <div
                  style={{
                    width: 24, height: 24, borderRadius: "50%", background: "var(--beige-light)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Icon name="activity" size={12} />
                </div>
                <div>
                  <div style={{ fontSize: 13 }}>{a.action}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {a.when ? D.relativeTime(a.when) : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const Field = ({ icon, label, value }: any) => (
  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "flex-start", gap: 12, fontSize: 13 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)" }}>
      <Icon name={icon} size={14} />
      <span>{label}</span>
    </div>
    <div style={{ fontWeight: 450 }}>{value}</div>
  </div>
);

// ============================================================
// CONTACT FORM MODAL (create/edit) — con secciones
// ============================================================
const emptyForm = {
  type: "cliente" as ContactType,
  name: "",
  nif: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  postalCode: "",
  province: "",
  country: "España",
  tagsInput: "",
  status: "activo",
};

export const ContactFormModal = ({
  open, onClose, onSubmit, initial, initialName,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NewContact) => Promise<void>;
  initial: Contact | null;
  initialName?: string;
}) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        type: initial.type,
        name: initial.name,
        nif: initial.nif || "",
        email: initial.email || "",
        phone: initial.phone || "",
        website: initial.website || "",
        address: initial.address || "",
        city: initial.city || "",
        postalCode: initial.postalCode || "",
        province: initial.province || "",
        country: initial.country || "España",
        tagsInput: initial.tags.join(", "),
        status: initial.status || "activo",
      });
    } else {
      // Al crear: pre-rellena el nombre si viene de otro contexto (p.ej. autocomplete)
      setForm({ ...emptyForm, name: initialName || "" });
    }
    setErr(null);
  }, [open, initial, initialName]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErr("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const tags = form.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await onSubmit({
        type: form.type,
        name: form.name.trim(),
        nif: form.nif || null,
        email: form.email || null,
        phone: form.phone || null,
        website: form.website || null,
        address: form.address || null,
        city: form.city || null,
        postalCode: form.postalCode || null,
        province: form.province || null,
        country: form.country || null,
        tags,
        status: form.status || null,
      });
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={620}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {initial ? "Editar contacto" : "Nuevo contacto"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            {initial ? "Actualiza los datos del contacto." : "Se guardará directamente en Supabase."}
          </p>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, overflow: "auto" }}>
          {/* --- Datos básicos --- */}
          <FormSection title="Datos básicos">
            <FormField label="Tipo">
              <div style={{ display: "flex", gap: 6 }}>
                {(["cliente", "proveedor", "lead"] as ContactType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("type", t)}
                    style={{
                      padding: "6px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
                      border: "1px solid var(--border)",
                      background: form.type === t ? "var(--black)" : "var(--surface)",
                      color: form.type === t ? "#fff" : "var(--text)",
                      textTransform: "capitalize",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Nombre *">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: Lumbre Estudio S.L." autoFocus />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FormField label="NIF / CIF">
                <Input value={form.nif} onChange={(e) => set("nif", e.target.value)} placeholder="B12345678" />
              </FormField>
              <FormField label="Estado">
                <div style={{ display: "flex", gap: 6 }}>
                  {["activo", "inactivo", "lead"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set("status", s)}
                      style={{
                        padding: "6px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
                        border: "1px solid var(--border)",
                        background: form.status === s ? "var(--beige)" : "var(--surface)",
                        color: "var(--text)", textTransform: "capitalize",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>

            <FormField label="Tags (separadas por coma)">
              <Input value={form.tagsInput} onChange={(e) => set("tagsInput", e.target.value)} placeholder="estratégico, b2b" />
            </FormField>
          </FormSection>

          {/* --- Contacto --- */}
          <FormSection title="Contacto">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FormField label="Email">
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="hola@empresa.com" />
              </FormField>
              <FormField label="Teléfono">
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+34 600 000 000" />
              </FormField>
            </div>
            <FormField label="Web">
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="empresa.com" />
            </FormField>
          </FormSection>

          {/* --- Dirección --- */}
          <FormSection title="Dirección">
            <FormField label="Dirección">
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Calle Mayor 12, 3º B" />
            </FormField>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 14 }}>
              <FormField label="C.P.">
                <Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} placeholder="28001" />
              </FormField>
              <FormField label="Ciudad">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Madrid" />
              </FormField>
              <FormField label="Provincia">
                <Input value={form.province} onChange={(e) => set("province", e.target.value)} placeholder="Madrid" />
              </FormField>
            </div>
            <FormField label="País">
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="España" />
            </FormField>
          </FormSection>

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
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear contacto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div
      style={{
        fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        paddingBottom: 6, borderBottom: "1px solid var(--border)",
      }}
    >
      {title}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
  </div>
);

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </span>
    {children}
  </label>
);

// ============================================================
// SKELETON ROWS (loading state)
// ============================================================
const SkeletonRows = () => (
  <>
    {Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
        {Array.from({ length: 10 }).map((_, j) => (
          <td key={j} style={{ padding: "14px 14px" }}>
            <Skeleton height={14} width={j === 1 ? "75%" : "60%"} />
          </td>
        ))}
      </tr>
    ))}
  </>
);
