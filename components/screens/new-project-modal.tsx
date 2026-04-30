// @ts-nocheck
"use client";
import * as React from "react";
import { useState, useEffect } from "react";
import { Icon, Button, Modal } from "@/components/ui";

/**
 * NewProjectModal — popup corporativo para crear un proyecto (módulo)
 * de un cliente. Usado desde:
 *   - ClienteOverview ("+ Nuevo proyecto" en la rejilla)
 *   - ClienteSidebar  ("+ Nuevo módulo" en la barra)
 */

const PROJECT_ICONS = [
  "📁", "📊", "💼", "🎨", "📝", "📅", "📌", "🔧",
  "🚀", "💡", "🎯", "📦", "🛠️", "📈", "📚", "🌱",
];

export const NewProjectModal = ({ open, onClose, onSubmit }) => {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setIcon("📁");
    setError(null);
    setSubmitting(false);
  }, [open]);

  const submit = async () => {
    if (!name.trim()) {
      setError("El nombre del proyecto es obligatorio.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), icon: icon || "📁" });
      onClose();
    } catch (e) {
      setError(e?.message || "No se pudo crear el proyecto.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={520}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Nuevo proyecto</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)", padding: 4 }}>
            <Icon name="close" size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Nombre */}
          <div>
            <label
              style={{
                fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.05em",
                display: "block", marginBottom: 6,
              }}
            >
              Nombre del proyecto *
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); submit(); }
              }}
              placeholder="Ej. Estrategia de contenidos, Calendario RRSS…"
              style={{
                width: "100%", padding: "10px 12px",
                border: "1px solid var(--border)", borderRadius: 8,
                fontSize: 14, fontFamily: "inherit", background: "var(--surface)",
              }}
            />
          </div>

          {/* Icono */}
          <div>
            <label
              style={{
                fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.05em",
                display: "block", marginBottom: 8,
              }}
            >
              Icono
            </label>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, marginBottom: 10,
            }}>
              {PROJECT_ICONS.map((emoji) => {
                const active = icon === emoji;
                return (
                  <button
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    style={{
                      height: 38, fontSize: 18,
                      borderRadius: 8,
                      background: active ? "var(--purple-soft)" : "var(--beige-bg)",
                      border: `1.5px solid ${active ? "var(--purple)" : "transparent"}`,
                      cursor: "pointer",
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                ¿Otro? Pega un emoji:
              </span>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                style={{
                  width: 56, padding: "5px 8px",
                  border: "1px solid var(--border)", borderRadius: 6,
                  fontSize: 14, fontFamily: "inherit", background: "var(--surface)",
                  textAlign: "center",
                }}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "#F5E1E1", color: "var(--error)",
                borderRadius: 8, fontSize: 12.5,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 22px", borderTop: "1px solid var(--border)",
            display: "flex", justifyContent: "flex-end", gap: 8,
            background: "var(--beige-bg)",
          }}
        >
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button variant="primary" onClick={submit} disabled={submitting || !name.trim()}>
            {submitting ? "Creando…" : "Crear proyecto"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
