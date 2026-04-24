"use client";
import { Icon, Button } from "@/components/ui";

export const ComprasHeader = ({
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

export const PAYMENT_METHODS_PURCHASE = [
  { id: "transferencia", label: "Transferencia" },
  { id: "tarjeta", label: "Tarjeta" },
  { id: "domiciliado", label: "Domiciliado" },
  { id: "efectivo", label: "Efectivo" },
  { id: "none", label: "No seleccionado" },
];

export const EXPENSE_CATEGORIES = [
  "Software",
  "Infraestructura",
  "Telecomunicaciones",
  "Servicios profesionales",
  "Suministros",
  "Nóminas",
  "Impuestos",
  "Marketing",
  "Viajes",
  "Material oficina",
  "Otros",
];

export const EXPENSE_ACCOUNTS = [
  "62200001 · Reparaciones y conservación",
  "62300001 · Servicios de profesionales independientes",
  "62600001 · Servicios bancarios",
  "62700001 · Publicidad y marketing",
  "62800001 · Suministros",
  "62900001 · Otros servicios",
  "64000001 · Sueldos y salarios",
  "65000001 · Servicios de infraestructura cloud",
  "65100001 · Software y licencias",
];
