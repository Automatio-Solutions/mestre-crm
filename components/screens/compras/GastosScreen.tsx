"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Icon, Button, Card, Badge, Input, EmptyState, Dropdown, DropdownItem, DropdownSeparator, TagPill, useConfirm,
} from "@/components/ui";
import { Th, Td } from "@/components/screens/contactos";
import { useContacts } from "@/lib/db/useContacts";
import { usePurchases } from "@/lib/db/usePurchases";
import { StatCard } from "@/components/screens/ventas/shared";
import { ComprasHeader } from "./shared";
import * as D from "@/lib/data";

const statusTone: Record<string, any> = {
  pagada: "success",
  pendiente: "warning",
  vencida: "error",
  borrador: "outline",
};

export function GastosScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { purchases, loading, update, remove, duplicate } = usePurchases();
  const { contacts } = useContacts();
  const contactsMap = useMemo(() => {
    const m = new Map<string, any>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const filtered = purchases.filter((p) => {
    if (statusFilter !== "todos" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const sup = contactsMap.get(p.supplierId || "");
      const hay = [p.number, p.concept, p.category, sup?.name].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totals = {
    mes: purchases
      .filter((p) => p.issueDate >= D.daysAgo(30))
      .reduce((s, p) => s + p.total, 0),
    iva: purchases.reduce((s, p) => s + p.vat, 0),
    pendiente: purchases.filter((p) => p.status === "pendiente").reduce((s, p) => s + p.total, 0),
    vencido: purchases.filter((p) => p.status === "vencida").reduce((s, p) => s + p.total, 0),
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <ComprasHeader
        section="Gastos"
        title="Gastos"
        description="Facturas recibidas y otros gastos"
        primary={{ label: "Nuevo gasto", icon: "plus", onClick: () => router.push("/compras/gastos/nuevo") }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
        <StatCard label="Total mes" value={totals.mes} sub={`${purchases.filter((p) => p.issueDate >= D.daysAgo(30)).length} gastos`} />
        <StatCard label="IVA soportado" value={totals.iva} color="var(--success)" sub="deducible" />
        <StatCard label="Pendiente pago" value={totals.pendiente} color="var(--warning)" sub={`${purchases.filter((p) => p.status === "pendiente").length} facturas`} />
        <StatCard label="Vencido" value={totals.vencido} color="var(--error)" sub={`${purchases.filter((p) => p.status === "vencida").length} facturas`} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nº, proveedor, concepto…"
            leftIcon={<Icon name="search" size={14} />}
          />
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--beige-bg)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
          {[
            { id: "todos", label: "Todos" },
            { id: "pendiente", label: "Pendientes" },
            { id: "pagada", label: "Pagadas" },
            { id: "vencida", label: "Vencidas" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: statusFilter === s.id ? "var(--surface)" : "transparent",
                color: statusFilter === s.id ? "var(--text)" : "var(--text-muted)",
                boxShadow: statusFilter === s.id ? "var(--shadow-sm)" : "none",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" leftIcon={<Icon name="filter" size={13} />}>Más filtros</Button>
      </div>

      <Card padding={0} style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--beige-bg)" }}>
              <Th style={{ width: 40 }} />
              <Th>Nº doc.</Th>
              <Th>Proveedor</Th>
              <Th>Concepto</Th>
              <Th>Categoría</Th>
              <Th>Fecha</Th>
              <Th align="right">Base</Th>
              <Th align="right">IVA</Th>
              <Th align="right">Total</Th>
              <Th>Estado</Th>
              <Th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Cargando gastos…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={11}>
                  <EmptyState
                    icon={<Icon name="receipt" size={28} />}
                    title={purchases.length === 0 ? "Sin gastos todavía" : "Sin resultados"}
                    description={purchases.length === 0 ? "Crea tu primer gasto desde el botón de arriba." : "Prueba con otro filtro."}
                  />
                </td>
              </tr>
            )}
            {!loading && filtered.map((p) => {
              const sup = contactsMap.get(p.supplierId || "");
              const handleDelete = async () => {
                const ok = await confirm({
                  title: "Eliminar gasto",
                  message: `¿Seguro que quieres eliminar el gasto ${p.number || "(sin número)"}?`,
                  danger: true,
                });
                if (!ok) return;
                await remove(p.id);
              };
              const handleDuplicate = async () => {
                const dup = await duplicate(p.id);
                router.push(`/compras/gastos/${dup.id}/editar`);
              };
              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/compras/gastos/${p.id}`)}
                  style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Td>
                    <Icon
                      name={p.source === "scan" ? "scan" : p.source === "email" ? "mail" : "upload"}
                      size={13}
                      style={{ color: "var(--text-muted)" }}
                    />
                  </Td>
                  <Td mono><span style={{ fontWeight: 500 }}>{p.number || "—"}</span></Td>
                  <Td>{sup?.name || "—"}</Td>
                  <Td muted>{p.concept || "—"}</Td>
                  <Td>{p.category ? <TagPill tag={p.category} size="sm" /> : <span style={{ color: "var(--text-faint)" }}>—</span>}</Td>
                  <Td muted>{D.fmtShort(p.issueDate)}</Td>
                  <Td align="right" mono>{p.base.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2 })} €</Td>
                  <Td align="right" mono muted>{p.vat.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2 })} €</Td>
                  <Td align="right" mono><span style={{ fontWeight: 600 }}>{p.total.toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2 })} €</span></Td>
                  <Td><Badge tone={statusTone[p.status]}>{p.status}</Badge></Td>
                  <Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Dropdown
                      align="end"
                      trigger={
                        <button
                          style={{ color: "var(--text-faint)", padding: 4, borderRadius: 4 }}
                          title="Acciones"
                        >
                          <Icon name="moreV" size={14} />
                        </button>
                      }
                    >
                      {p.status === "pendiente" && (
                        <DropdownItem
                          leftIcon={<Icon name="check" size={13} />}
                          onClick={() => update(p.id, { status: "pagada", payDate: new Date() })}
                        >
                          Marcar pagada
                        </DropdownItem>
                      )}
                      <DropdownItem
                        leftIcon={<Icon name="edit" size={13} />}
                        onClick={() => router.push(`/compras/gastos/${p.id}/editar`)}
                      >
                        Editar
                      </DropdownItem>
                      <DropdownItem
                        leftIcon={<Icon name="fileText" size={13} />}
                        onClick={handleDuplicate}
                      >
                        Duplicar
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem
                        leftIcon={<Icon name="trash" size={13} />}
                        onClick={handleDelete}
                        danger
                      >
                        Eliminar
                      </DropdownItem>
                    </Dropdown>
                  </Td>
                </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: "1.5px solid var(--border-strong)", background: "var(--beige-bg)" }}>
                <Td colSpan={6}>
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Totales ({filtered.length})
                  </span>
                </Td>
                <Td align="right" mono style={{ fontWeight: 600 }}>
                  {filtered.reduce((s, p) => s + p.base, 0).toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2 })} €
                </Td>
                <Td align="right" mono style={{ fontWeight: 600 }}>
                  {filtered.reduce((s, p) => s + p.vat, 0).toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2 })} €
                </Td>
                <Td align="right" mono style={{ fontWeight: 600 }}>
                  {filtered.reduce((s, p) => s + p.total, 0).toLocaleString("es-ES", { useGrouping: "always" as any, minimumFractionDigits: 2 })} €
                </Td>
                <Td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
