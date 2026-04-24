"use client";
import { useRouter } from "next/navigation";
import { Icon, Button, Card, Badge, EmptyState, Dropdown, DropdownItem, DropdownSeparator, TagPill, useConfirm } from "@/components/ui";
import { Th, Td, Field } from "@/components/screens/contactos";
import { useContacts } from "@/lib/db/useContacts";
import { usePurchases } from "@/lib/db/usePurchases";
import { calcLineSubtotal } from "@/lib/db/invoices";
import * as D from "@/lib/data";

const statusTone: Record<string, any> = {
  pagada: "success", pendiente: "warning", vencida: "error", borrador: "outline",
};

const PAYMENT_LABELS: Record<string, string> = {
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  domiciliado: "Domiciliado",
  efectivo: "Efectivo",
  none: "—",
};

export function PurchaseDetailScreen({ purchaseId }: { purchaseId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { purchases, loading, update, remove, duplicate } = usePurchases();
  const { contacts } = useContacts();

  const p = purchases.find((x) => x.id === purchaseId);
  const sup = p ? contacts.find((c) => c.id === p.supplierId) : null;

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Cargando gasto…</div>;
  }
  if (!p) {
    return (
      <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
        <Button variant="ghost" leftIcon={<Icon name="chevronLeft" size={14} />} onClick={() => router.push("/compras/gastos")}>
          Volver
        </Button>
        <EmptyState icon={<Icon name="receipt" size={28} />} title="Gasto no encontrado" />
      </div>
    );
  }

  const lines = p.lines.length > 0 ? p.lines : [{
    id: "l1",
    concept: p.concept || "—",
    description: "",
    quantity: 1,
    price: p.base,
    vat: p.vatPct,
    discount: 0,
  } as any];

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Eliminar gasto",
      message: `¿Seguro que quieres eliminar el gasto ${p.number || "(sin número)"}?`,
      danger: true,
    });
    if (!ok) return;
    await remove(p.id);
    router.push("/compras/gastos");
  };

  return (
    <div style={{ padding: "24px 32px 48px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Button variant="ghost" size="icon" onClick={() => router.push("/compras/gastos")} title="Cerrar">
          <Icon name="close" size={14} />
        </Button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <h1 style={{
              fontSize: 16, fontWeight: 500, margin: 0, letterSpacing: "-0.01em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {sup?.name || "—"} · Gasto {p.number || p.id}
            </h1>
            <Badge tone={statusTone[p.status]}>{p.status}</Badge>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Dropdown
            align="end"
            trigger={<Button variant="ghost" size="icon" title="Más"><Icon name="moreV" size={14} /></Button>}
          >
            <DropdownItem
              leftIcon={<Icon name="edit" size={13} />}
              onClick={() => router.push(`/compras/gastos/${p.id}/editar`)}
            >
              Editar
            </DropdownItem>
            <DropdownItem
              leftIcon={<Icon name="fileText" size={13} />}
              onClick={async () => {
                const dup = await duplicate(p.id);
                router.push(`/compras/gastos/${dup.id}/editar`);
              }}
            >
              Duplicar
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem danger leftIcon={<Icon name="trash" size={13} />} onClick={handleDelete}>
              Eliminar
            </DropdownItem>
          </Dropdown>
          {p.status === "pendiente" && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Icon name="check" size={13} />}
              onClick={() => update(p.id, { status: "pagada", payDate: new Date() })}
            >
              Marcar pagada
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 18 }}>
        {/* LEFT */}
        <div>
          {/* Lines */}
          <Card padding={0} style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 500 }}>
              Líneas del gasto
            </div>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--beige-bg)" }}>
                  <Th>Concepto</Th>
                  <Th align="right">Cant.</Th>
                  <Th align="right">Precio</Th>
                  <Th align="right">IVA</Th>
                  <Th align="right">Subtotal</Th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l: any, i: number) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td>
                      <div style={{ fontWeight: 500 }}>{l.concept || "—"}</div>
                      {l.description && (
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, whiteSpace: "pre-wrap" }}>
                          {l.description}
                        </div>
                      )}
                    </Td>
                    <Td align="right" mono>{l.quantity}</Td>
                    <Td align="right" mono>{l.price.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Td>
                    <Td align="right" mono muted>{l.vat}%</Td>
                    <Td align="right" mono style={{ fontWeight: 500 }}>{calcLineSubtotal(l).toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Adjuntos */}
          {p.attachments.length > 0 && (
            <Card padding={18}>
              <div style={sectionHeader}>Archivos adjuntos</div>
              {p.attachments.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13 }}>
                  <Icon name="paperclip" size={13} style={{ color: "var(--text-muted)" }} />
                  <span>{a}</span>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* RIGHT */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card padding={18}>
            <div style={sectionHeader}>Totales</div>
            <SummaryRow label="Base imponible" value={<span style={{ }}>{p.base.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>} />
            <SummaryRow label={`IVA (${p.vatPct}%)`} value={<span style={{ }}>{p.vat.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>} />
            <SummaryRow
              label="Total"
              value={<span style={{ fontWeight: 600 }}>{p.total.toLocaleString("es-ES", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>}
              last
            />
          </Card>

          <Card padding={18}>
            <div style={sectionHeader}>Información</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field icon="building" label="Proveedor" value={sup?.name || "—"} />
              <Field icon="fileText" label="Nº documento" value={p.number || "—"} />
              <Field icon="calendar" label="Emisión" value={D.fmtDate(p.issueDate)} />
              <Field icon="clock" label="Fecha pago" value={p.payDate ? D.fmtDate(p.payDate) : "—"} />
              <Field icon="creditCard" label="Método" value={PAYMENT_LABELS[p.paymentMethod] || p.paymentMethod} />
            </div>
          </Card>

          <Card padding={18}>
            <div style={sectionHeader}>Categorización</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field
                icon="tag"
                label="Categoría"
                value={p.category ? <TagPill tag={p.category} /> : "—"}
              />
              <Field icon="book" label="Cuenta" value={p.account || "—"} />
              {p.tags.length > 0 && (
                <Field
                  icon="tag"
                  label="Etiquetas"
                  value={
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {p.tags.map((t) => <TagPill key={t} tag={t} size="sm" />)}
                    </div>
                  }
                />
              )}
            </div>
          </Card>

          {p.internalNote && (
            <Card padding={18}>
              <div style={sectionHeader}>Nota interna</div>
              <div style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {p.internalNote}
              </div>
            </Card>
          )}

          {sup && (
            <Card padding={18}>
              <div style={sectionHeader}>Proveedor</div>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: 10,
                  background: "var(--beige-bg)", borderRadius: 8, cursor: "pointer",
                }}
                onClick={() => router.push(`/contactos/${sup.id}`)}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 7, background: "var(--beige)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600,
                }}>
                  {sup.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{sup.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sup.nif || "—"}</div>
                </div>
                <Icon name="chevronRight" size={13} style={{ color: "var(--text-faint)" }} />
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

const sectionHeader: React.CSSProperties = {
  fontSize: 11, color: "var(--text-muted)", fontWeight: 500,
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12,
};

function SummaryRow({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", fontSize: 12.5,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
