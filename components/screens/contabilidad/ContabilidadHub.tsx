"use client";
import { useRouter } from "next/navigation";
import { Card, Icon } from "@/components/ui";

const SECTIONS = [
  {
    href: "/contabilidad/libro-diario",
    icon: "book",
    title: "Libro diario",
    description: "Registro cronológico de asientos contables con doble partida (debe = haber).",
  },
  {
    href: "/contabilidad/cuadro-cuentas",
    icon: "list",
    title: "Cuadro de cuentas",
    description: "Catálogo maestro de cuentas del Plan General Contable. Estructura las cuentas que usarás en los asientos.",
  },
  {
    href: "/contabilidad/balance-situacion",
    icon: "columns",
    title: "Balance de situación",
    description: "Foto patrimonial a una fecha. Activo vs Pasivo + Patrimonio Neto.",
  },
  {
    href: "/contabilidad/perdidas-ganancias",
    icon: "chart",
    title: "Pérdidas y ganancias",
    description: "Ingresos − Gastos del periodo. Resultado y margen.",
  },
];

export function ContabilidadHub() {
  const router = useRouter();
  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>Contabilidad</h1>
        <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>
          Plan contable, libro diario y estados financieros.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {SECTIONS.map((s) => (
          <Card
            key={s.href}
            padding={20}
            interactive
            onClick={() => router.push(s.href)}
          >
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 38, height: 38, borderRadius: 9,
              background: "var(--beige-bg)", color: "var(--text)",
              marginBottom: 12,
            }}>
              <Icon name={s.icon} size={18} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.45 }}>
              {s.description}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
