"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Badge } from "@/components/ui";
import * as DMData from "@/lib/data";

interface PaletteItem {
  type: string;
  label: string;
  subtitle?: string;
  path: string;
  icon: string;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const pages: PaletteItem[] = [
      { type: "Página", label: "Dashboard", path: "/", icon: "home" },
      { type: "Página", label: "Contactos", path: "/contactos", icon: "users" },
      { type: "Página", label: "Facturas", path: "/ventas/facturas", icon: "receipt" },
      { type: "Página", label: "Presupuestos", path: "/ventas/presupuestos", icon: "fileText" },
      { type: "Página", label: "Servicios", path: "/ventas/servicios", icon: "tag" },
      { type: "Página", label: "Compras", path: "/compras/compras", icon: "shopping" },
      { type: "Página", label: "Escáner de facturas", path: "/compras/escaner", icon: "scan" },
      { type: "Página", label: "Libro diario", path: "/contabilidad/libro-diario", icon: "book" },
      { type: "Página", label: "Cuadro de cuentas", path: "/contabilidad/cuadro-cuentas", icon: "book" },
      { type: "Página", label: "Pérdidas y ganancias", path: "/contabilidad/perdidas-ganancias", icon: "chart" },
      { type: "Página", label: "Balance", path: "/contabilidad/balance-situacion", icon: "landmark" },
      { type: "Página", label: "Impuestos", path: "/impuestos", icon: "landmark" },
      { type: "Página", label: "Analítica", path: "/analitica", icon: "chart" },
      { type: "Página", label: "Clientes (proyectos)", path: "/clientes", icon: "folder" },
    ];
    const contacts: PaletteItem[] = DMData.CONTACTS.map((c: any) => ({
      type: "Contacto",
      label: c.name,
      subtitle: c.nif + " · " + c.city,
      path: `/contactos?open=${c.id}`,
      icon: "building",
    }));
    const clientSpaces: PaletteItem[] = DMData.CLIENT_SPACES.map((c: any) => ({
      type: "Cliente",
      label: c.name,
      subtitle: c.sector,
      path: `/clientes/${c.id}`,
      icon: "folder",
    }));
    const tasks: PaletteItem[] = DMData.TASKS.slice(0, 30).map((t: any) => {
      const space = DMData.CLIENT_SPACES.find((s: any) => s.id === t.clientId);
      return {
        type: "Tarea",
        label: t.title,
        subtitle: space?.name,
        path: `/clientes/${t.clientId}/${t.moduleId}?task=${t.id}`,
        icon: "check",
      };
    });
    const all = [...pages, ...contacts, ...clientSpaces, ...tasks];
    if (!q.trim()) return all.slice(0, 12);
    const lq = q.toLowerCase();
    return all.filter((x) => (x.label + " " + (x.subtitle || "")).toLowerCase().includes(lq)).slice(0, 14);
  }, [q]);

  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [q]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(items.length - 1, s + 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(0, s - 1)); }
      if (e.key === "Enter")     {
        e.preventDefault();
        const item = items[selected];
        if (item) { router.push(item.path); onClose(); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, items, selected, router, onClose]);

  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 150, padding: "15vh 20px 20px",
        display: "flex", justifyContent: "center", alignItems: "flex-start",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", animation: "fadeIn 120ms ease" }}
      />
      <div
        style={{
          position: "relative", width: 620, maxWidth: "100%",
          background: "var(--surface)", borderRadius: 14,
          boxShadow: "var(--shadow-lg)", overflow: "hidden",
          animation: "slideUp 160ms ease",
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 16px", borderBottom: "1px solid var(--border)",
          }}
        >
          <Icon name="search" size={16} style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar páginas, contactos, tareas…"
            style={{
              flex: 1, height: 28, border: "none", outline: "none",
              background: "transparent", fontSize: 14,
            }}
          />
          <kbd style={{ padding: "2px 6px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11, color: "var(--text-muted)" }}>
            esc
          </kbd>
        </div>
        <div style={{ maxHeight: 420, overflow: "auto", padding: 6 }}>
          {items.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Sin resultados
            </div>
          )}
          {items.map((item, i) => (
            <button
              key={item.path + i}
              onMouseEnter={() => setSelected(i)}
              onClick={() => { router.push(item.path); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "8px 10px", borderRadius: 8, textAlign: "left",
                background: selected === i ? "var(--beige-light)" : "transparent",
              }}
            >
              <div style={{ color: "var(--text-muted)" }}><Icon name={item.icon} size={16} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                {item.subtitle && (
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{item.subtitle}</div>
                )}
              </div>
              <Badge tone="outline">{item.type}</Badge>
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "8px 14px", borderTop: "1px solid var(--border)",
            fontSize: 11, color: "var(--text-muted)", background: "var(--beige-bg)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd style={kbd}>↑↓</kbd> navegar
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd style={kbd}>↵</kbd> abrir
          </span>
          <span style={{ marginLeft: "auto" }}>Dani Mestre CRM</span>
        </div>
      </div>
    </div>
  );
}

const kbd: React.CSSProperties = {
  padding: "1px 5px", background: "var(--surface)",
  border: "1px solid var(--border)", borderRadius: 3,
};
