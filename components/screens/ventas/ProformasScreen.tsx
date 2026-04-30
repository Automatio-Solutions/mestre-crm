"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon, Card, Badge, Button } from "@/components/ui";
import { Th, Td } from "@/components/screens/contactos";
import { useContacts } from "@/lib/db/useContacts";
import { StatCard, VentasHeader } from "./shared";
import * as D from "@/lib/data";

const statusTone: Record<string, any> = {
  pendiente: "warning",
  facturada: "purple",
  cobrada: "success",
  vencida: "error",
};

export function ProformasScreen() {
  const router = useRouter();
  const { contacts } = useContacts();
  const contactsMap = useMemo(() => {
    const m = new Map<string, any>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  const proformas = D.PROFORMAS;

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <VentasHeader
        section="Proformas"
        title="Proformas"
        description="Facturas de anticipo no fiscales"
        primary={{ label: "Nueva proforma", icon: "plus" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard
          label="Pendientes"
          value={proformas.filter((p: any) => p.status === "pendiente").reduce((s: number, p: any) => s + p.amount, 0)}
          color="var(--warning)"
        />
        <StatCard
          label="Cobradas"
          value={proformas.filter((p: any) => p.status === "cobrada").reduce((s: number, p: any) => s + p.amount, 0)}
          color="var(--success)"
          sub="Anticipos recibidos"
        />
        <StatCard
          label="Convertidas a factura"
          value={proformas.filter((p: any) => p.status === "facturada").length}
          format="number"
          suffix=" docs"
          sub="Ya facturadas"
        />
      </div>

      <Card padding={16} style={{ marginBottom: 16, background: "var(--purple-soft)", border: "1px solid #D4CEEE" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="alert" size={16} style={{ color: "var(--purple)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: "var(--text)" }}>
            <b>Las proformas no son documentos fiscales.</b> Úsalas como presupuesto con formato de factura o para cobrar anticipos. Cuando el cliente paga, conviértela en factura real para que cuente a efectos de IVA.
          </div>
        </div>
      </Card>

      <Card padding={0} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--beige-bg)" }}>
              <Th>Número</Th>
              <Th>Cliente</Th>
              <Th>Concepto</Th>
              <Th>Emisión</Th>
              <Th>Válida hasta</Th>
              <Th align="right">Importe</Th>
              <Th>Estado</Th>
              <Th>Origen</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {proformas.map((p: any) => {
              const cli = contactsMap.get(p.clientId);
              return (
                <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <Td mono style={{ fontWeight: 500 }}>{p.number}</Td>
                  <Td>{cli?.name || "—"}</Td>
                  <Td muted>{p.concept}</Td>
                  <Td muted>{D.fmtShort(p.issueDate)}</Td>
                  <Td muted>{D.fmtShort(p.validUntil)}</Td>
                  <Td align="right" mono style={{ fontWeight: 500 }}>{p.amount.toLocaleString("es-ES", { useGrouping: "always" as any })} €</Td>
                  <Td><Badge tone={statusTone[p.status]}>{p.status}</Badge></Td>
                  <Td>
                    {p.linkedQuoteId && (
                      <button
                        onClick={() => router.push(`/ventas/presupuestos/${p.linkedQuoteId}`)}
                        style={{ fontSize: 11.5, color: "var(--purple)" }}
                      >
                        ← {p.linkedQuoteId.toUpperCase()}
                      </button>
                    )}
                    {p.linkedInvoiceId && (
                      <button
                        onClick={() => router.push(`/ventas/facturas/${p.linkedInvoiceId}`)}
                        style={{ fontSize: 11.5, color: "var(--success)" }}
                      >
                        → factura
                      </button>
                    )}
                    {!p.linkedQuoteId && !p.linkedInvoiceId && (
                      <span style={{ color: "var(--text-faint)", fontSize: 11 }}>—</span>
                    )}
                  </Td>
                  <Td>
                    {p.status === "pendiente" && (
                      <Button variant="ghost" size="sm">Convertir</Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
