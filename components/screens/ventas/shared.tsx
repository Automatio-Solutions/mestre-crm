"use client";
import { Card, Icon, Button } from "@/components/ui";

// StatCard — reutilizable en Ventas
export const StatCard = ({
  label, value, sub, color = "var(--text)", format = "currency", suffix,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
  format?: "currency" | "number" | "text";
  suffix?: string;
}) => {
  let display: string;
  if (format === "currency" && typeof value === "number") {
    display = value.toLocaleString("es-ES", { useGrouping: "always" as any, style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  } else if (format === "number" && typeof value === "number") {
    display = value.toLocaleString("es-ES", { useGrouping: "always" as any });
  } else {
    display = String(value);
  }
  if (suffix) display = display + suffix;
  return (
    <Card padding={18}>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em", color, lineHeight: 1.1 }}>{display}</div>
      {sub && (
        <div style={{
          fontSize: 11.5, color: "var(--text-muted)", marginTop: 6,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {sub}
        </div>
      )}
    </Card>
  );
};

// Toggle binario (informativo)
export const Toggle = ({ checked }: { checked: boolean }) => (
  <span style={{
    display: "inline-block", width: 28, height: 16, borderRadius: 10,
    background: checked ? "var(--success)" : "var(--border-strong)",
    position: "relative", transition: "background 160ms",
  }}>
    <span style={{
      position: "absolute", top: 2, left: checked ? 14 : 2,
      width: 12, height: 12, borderRadius: "50%", background: "#fff",
      boxShadow: "0 1px 2px rgba(0,0,0,0.2)", transition: "left 160ms",
    }}/>
  </span>
);

// Cabecera unificada para todas las pantallas de Ventas.
// Nota: el breadcrumb vive en el header global (AppShell); aquí solo título + descripción.
export const VentasHeader = ({
  section, title, description, primary,
}: {
  section: string;
  title: string;
  description: string;
  primary?: { label: string; icon: string; onClick?: () => void };
}) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 20 }}>
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>{title}</h1>
      <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>{description}</p>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <Button variant="outline" leftIcon={<Icon name="download" size={14} />}>Exportar</Button>
      {primary && (
        <Button variant="primary" leftIcon={<Icon name={primary.icon} size={14} />} onClick={primary.onClick}>
          {primary.label}
        </Button>
      )}
    </div>
  </div>
);
