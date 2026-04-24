"use client";
import { useEffect, useState } from "react";
import { Card, Badge, Icon, Button, Modal, Input, Dropdown, DropdownItem, DropdownSeparator, EmptyState, useConfirm } from "@/components/ui";
import { StatCard, VentasHeader } from "./shared";
import { useServices } from "@/lib/db/useServices";
import type { Service, NewService } from "@/lib/db/services";

export function ServiciosScreen() {
  const confirm = useConfirm();
  const { services, loading, create, update, remove } = useServices();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setFormOpen(true); };

  const handleSubmit = async (values: NewService) => {
    if (editing) await update(editing.id, values);
    else await create(values);
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async (s: Service) => {
    const ok = await confirm({
      title: "Eliminar servicio",
      message: `¿Seguro que quieres eliminar el servicio "${s.name}"?`,
      danger: true,
    });
    if (!ok) return;
    await remove(s.id);
  };

  const byCategory: Record<string, Service[]> = {};
  services.forEach((s) => {
    const cat = s.category || "Sin categoría";
    (byCategory[cat] = byCategory[cat] || []).push(s);
  });

  const activeServices = services.filter((s) => s.active);
  const avgPrice = activeServices.length > 0
    ? Math.round(activeServices.reduce((acc, s) => acc + s.price, 0) / activeServices.length)
    : 0;
  const mostExpensive = [...activeServices].sort((a, b) => b.price - a.price)[0];

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <VentasHeader
        section="Servicios"
        title="Servicios"
        description="Catálogo de servicios facturables"
        primary={{ label: "Nuevo servicio", icon: "plus", onClick: openNew }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard label="Servicios activos" value={activeServices.length} format="number" />
        <StatCard label="Precio medio" value={avgPrice} sub="Sin IVA" />
        <StatCard
          label="Categorías"
          value={Object.keys(byCategory).length}
          format="number"
          suffix=" líneas"
        />
        <StatCard
          label="Más alto"
          value={mostExpensive?.name || "—"}
          format="text"
          sub={mostExpensive ? `${mostExpensive.price.toLocaleString("es-ES", { useGrouping: "always" })} €` : undefined}
        />
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          Cargando servicios…
        </div>
      )}

      {!loading && services.length === 0 && (
        <EmptyState
          icon={<Icon name="grid" size={28} />}
          title="Sin servicios todavía"
          description="Crea tu primer servicio del catálogo. Podrás usarlo en facturas con @."
          action={
            <Button variant="primary" leftIcon={<Icon name="plus" size={14} />} onClick={openNew}>
              Nuevo servicio
            </Button>
          }
        />
      )}

      {!loading && Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{
              fontSize: 11, color: "var(--text-muted)", fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {cat}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{items.length} servicios</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
            {items.map((s) => (
              <Card
                key={s.id}
                padding={16}
                interactive
                onClick={() => openEdit(s)}
                style={{ opacity: s.active ? 1 : 0.55 }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.3 }}>
                    {s.name}
                    {!s.active && (
                      <span style={{
                        marginLeft: 8, fontSize: 10.5, fontWeight: 500,
                        color: "var(--text-muted)", background: "var(--beige-bg)",
                        padding: "1px 6px", borderRadius: 4,
                      }}>
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      align="end"
                      trigger={
                        <button
                          type="button"
                          style={{ color: "var(--text-faint)", padding: 2, borderRadius: 4 }}
                          title="Acciones"
                        >
                          <Icon name="moreV" size={13} />
                        </button>
                      }
                    >
                      <DropdownItem
                        leftIcon={<Icon name="edit" size={13} />}
                        onClick={() => openEdit(s)}
                      >
                        Editar
                      </DropdownItem>
                      <DropdownItem
                        leftIcon={<Icon name={s.active ? "eye" : "check"} size={13} />}
                        onClick={() => update(s.id, { active: !s.active })}
                      >
                        {s.active ? "Desactivar" : "Activar"}
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem
                        leftIcon={<Icon name="trash" size={13} />}
                        danger
                        onClick={() => handleDelete(s)}
                      >
                        Eliminar
                      </DropdownItem>
                    </Dropdown>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 14, minHeight: 16 }}>
                  {s.description || "—"}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 500 }}>
                      {s.price.toLocaleString("es-ES", { useGrouping: "always" })} €
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>+ {s.vat}% IVA</div>
                  </div>
                  <Badge tone="neutral">{cat}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <ServiceFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        initial={editing}
        existingCategories={Object.keys(byCategory).filter((c) => c !== "Sin categoría")}
      />
    </div>
  );
}

// ===============================================
// Modal Nuevo / Editar servicio
// ===============================================
const empty: NewService & { active: boolean } = {
  name: "",
  category: "",
  description: "",
  price: 0,
  vat: 21,
  active: true,
};

function ServiceFormModal({
  open, onClose, onSubmit, initial, existingCategories,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NewService) => Promise<void>;
  initial: Service | null;
  existingCategories: string[];
}) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        category: initial.category || "",
        description: initial.description || "",
        price: initial.price,
        vat: initial.vat,
        active: initial.active,
      });
    } else {
      setForm(empty);
    }
    setErr(null);
  }, [open, initial]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("El nombre es obligatorio.");
    if (form.price < 0) return setErr("El precio no puede ser negativo.");
    setSaving(true);
    setErr(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        category: form.category?.trim() || null,
        description: form.description?.trim() || null,
        price: Number(form.price) || 0,
        vat: Number(form.vat) || 0,
        active: form.active,
      });
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const VAT_PRESETS = [0, 4, 10, 21];

  return (
    <Modal open={open} onClose={onClose} width={540}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {initial ? "Editar servicio" : "Nuevo servicio"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            Los servicios activos aparecen en el autocompletado <code>@</code> de las facturas.
          </p>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
          <FormField label="Nombre *">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: Consultoría estratégica (hora)" autoFocus />
          </FormField>

          <FormField label="Categoría">
            <Input
              value={form.category || ""}
              onChange={(e) => set("category", e.target.value)}
              list="service-categories"
              placeholder="Consultoría, Desarrollo, Marketing…"
            />
            <datalist id="service-categories">
              {existingCategories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </FormField>

          <FormField label="Descripción">
            <textarea
              value={form.description || ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Breve descripción. Se copiará a la línea de factura al seleccionarlo."
              rows={3}
              style={{
                width: "100%", padding: "8px 10px", fontSize: 13,
                border: "1px solid var(--border)", borderRadius: 8,
                background: "var(--surface)", outline: "none",
                fontFamily: "inherit", resize: "vertical",
              }}
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Precio (€) *">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price === 0 ? "" : form.price}
                onChange={(e) => set("price", Number(e.target.value) || 0)}
                placeholder="0"
              />
            </FormField>
            <FormField label="IVA">
              <div style={{ display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
                {VAT_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set("vat", p)}
                    style={{
                      flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                      background: form.vat === p ? "var(--surface)" : "transparent",
                      color: form.vat === p ? "var(--text)" : "var(--text-muted)",
                      boxShadow: form.vat === p ? "var(--shadow-sm)" : "none",
                    }}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </FormField>
          </div>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
            />
            <span>Activo (aparece en el autocompletado de facturas)</span>
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
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear servicio"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
