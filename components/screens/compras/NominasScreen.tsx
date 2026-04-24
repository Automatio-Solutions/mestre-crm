"use client";
import { Icon, Button, Card, Badge, EmptyState } from "@/components/ui";
import { Th, Td } from "@/components/screens/contactos";
import { StatCard } from "@/components/screens/ventas/shared";
import { ComprasHeader } from "./shared";
import * as D from "@/lib/data";

export function NominasScreen() {
  // Fase 1: esqueleto con mock del diseño original.
  // Fase futura: tabla `payroll` en Supabase con empleados, nóminas mensuales, IRPF, SS, etc.
  const employees = (D.EMPLOYEES as any[] | undefined) || [];
  const summary = (D.PAYROLL_SUMMARY as any) || {
    monthTotal: 0,
    irpfRetained: 0,
    ssPatronal: 0,
    ssTrabajador: 0,
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <ComprasHeader
        section="Nóminas"
        title="Nóminas"
        description="Empleados, nóminas mensuales y cotizaciones sociales"
        primary={{ label: "Nueva nómina", icon: "plus" }}
      />

      <Card padding={16} style={{ marginBottom: 16, background: "var(--purple-soft)", border: "1px solid #D4CEEE" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="alert" size={16} style={{ color: "var(--purple)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: "var(--text)" }}>
            <b>Módulo en preview.</b> Los datos de esta pantalla son de ejemplo. La gestión real de nóminas con generación de recibos y presentación de modelos se añadirá en una iteración posterior.
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard label="Total bruto mes" value={summary.monthTotal} sub={`${employees.length} empleados`} />
        <StatCard label="IRPF retenido" value={summary.irpfRetained} color="var(--warning)" sub="A liquidar modelo 111" />
        <StatCard label="SS patronal" value={summary.ssPatronal} color="var(--purple)" sub="Cuota empresa" />
        <StatCard label="SS trabajador" value={summary.ssTrabajador} sub="Retención" />
      </div>

      <Card padding={0} style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 500 }}>
          Empleados
        </div>
        {employees.length === 0 ? (
          <EmptyState
            icon={<Icon name="users" size={28} />}
            title="Sin empleados"
            description="Cuando añadas empleados, sus nóminas aparecerán aquí agrupadas por mes."
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--beige-bg)" }}>
                <Th>Empleado</Th>
                <Th>Puesto</Th>
                <Th>Tipo</Th>
                <Th align="right">Bruto/mes</Th>
                <Th align="right">Neto/mes</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e: any) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <Td><b style={{ fontWeight: 500 }}>{e.name}</b></Td>
                  <Td muted>{e.role}</Td>
                  <Td><Badge tone="neutral">{e.type || "Indefinido"}</Badge></Td>
                  <Td align="right" mono>{(e.grossMonth || 0).toLocaleString("es-ES", { useGrouping: "always", style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</Td>
                  <Td align="right" mono>{(e.netMonth || 0).toLocaleString("es-ES", { useGrouping: "always", style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</Td>
                  <Td><Badge tone={e.active === false ? "outline" : "success"}>{e.active === false ? "Baja" : "Alta"}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
