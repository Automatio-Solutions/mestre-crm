"use client";
import { useEffect, useState } from "react";
import { Modal, Input, Button } from "@/components/ui";
import type { ClientSpace, NewClientSpace } from "@/lib/db/clientSpaces";

const COLORS = ["#6A5ACD", "#B84545", "#4A7C59", "#C89B3C", "#2F4858", "#8C2E2E", "#5A4D2E", "#2A6FB3"];

export const ClientSpaceFormModal = ({
  open, onClose, onSubmit, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NewClientSpace) => Promise<void>;
  initial: ClientSpace | null;
}) => {
  const [form, setForm] = useState({
    name: "",
    logo: "",
    color: COLORS[0],
    sector: "",
    description: "",
    activeSince: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        logo: initial.logo || "",
        color: initial.color || COLORS[0],
        sector: initial.sector || "",
        description: initial.description || "",
        activeSince: initial.activeSince || "",
      });
    } else {
      setForm({
        name: "",
        logo: "",
        color: COLORS[0],
        sector: "",
        description: "",
        activeSince: new Date().toLocaleDateString("es-ES", { month: "short", year: "numeric" }),
      });
    }
    setErr(null);
  }, [open, initial]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const initialsFromName = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("El nombre es obligatorio.");
    setSaving(true);
    setErr(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        logo: form.logo.trim() || initialsFromName(form.name),
        color: form.color,
        sector: form.sector || null,
        description: form.description || null,
        activeSince: form.activeSince || null,
      });
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {initial ? "Editar cliente" : "Nuevo espacio de cliente"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
            Crea un workspace para organizar módulos y tareas de este cliente.
          </p>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
          <FormField label="Nombre *">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: Lumbre Estudio" autoFocus />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Logo (1-2 letras)">
              <Input value={form.logo} onChange={(e) => set("logo", e.target.value)} maxLength={2} placeholder={initialsFromName(form.name)} />
            </FormField>
            <FormField label="Sector">
              <Input value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Branding, Salud…" />
            </FormField>
          </div>

          <FormField label="Color">
            <div style={{ display: "flex", gap: 6 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  style={{
                    width: 28, height: 28, borderRadius: 7, background: c,
                    border: form.color === c ? "2px solid var(--text)" : "2px solid transparent",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </FormField>

          <FormField label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Breve contexto del cliente"
              style={{
                minHeight: 72, padding: "8px 12px", fontSize: 13,
                border: "1px solid var(--border)", borderRadius: 8,
                background: "var(--surface)", fontFamily: "inherit", resize: "vertical",
              }}
            />
          </FormField>

          <FormField label="Activo desde">
            <Input value={form.activeSince} onChange={(e) => set("activeSince", e.target.value)} placeholder="Ene 2026" />
          </FormField>

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
            {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </span>
    {children}
  </label>
);
