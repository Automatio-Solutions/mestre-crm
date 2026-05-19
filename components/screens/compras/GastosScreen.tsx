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
import { ComprasHeader, PAYMENT_METHODS_PURCHASE, EXPENSE_CATEGORIES } from "./shared";
import * as D from "@/lib/data";

const statusTone: Record<string, any> = {
  pagada: "success",
  pendiente: "warning",
  vencida: "error",
  borrador: "outline",
};

// ---- CSV helpers ----
const csvEscape = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvDate = (d: any) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
};
function downloadCSV(filename: string, rows: any[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

  // ---- Filtros básicos ----
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // ---- Filtros avanzados ----
  const [showFilters, setShowFilters] = useState(false);
  const [fSupplier, setFSupplier] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fSource, setFSource] = useState(""); // upload | email | scan
  const [fMethod, setFMethod] = useState("");
  const [fIssueFrom, setFIssueFrom] = useState("");
  const [fIssueTo, setFIssueTo] = useState("");
  const [fTotalMin, setFTotalMin] = useState("");
  const [fTotalMax, setFTotalMax] = useState("");

  const activeFilterCount =
    (fSupplier ? 1 : 0) +
    (fCategory ? 1 : 0) +
    (fSource ? 1 : 0) +
    (fMethod ? 1 : 0) +
    (fIssueFrom || fIssueTo ? 1 : 0) +
    (fTotalMin || fTotalMax ? 1 : 0);

  const clearFilters = () => {
    setFSupplier(""); setFCategory(""); setFSource(""); setFMethod("");
    setFIssueFrom(""); setFIssueTo("");
    setFTotalMin(""); setFTotalMax("");
  };

  const filtered = useMemo(() => {
    let r = purchases;
    if (statusFilter !== "todos") r = r.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((p) => {
        const sup = contactsMap.get(p.supplierId || "");
        return [p.number, p.concept, p.category, sup?.name].filter(Boolean).join(" ").toLowerCase().includes(q);
      });
    }
    if (fSupplier) r = r.filter((p) => p.supplierId === fSupplier);
    if (fCategory) r = r.filter((p) => (p.category || "") === fCategory);
    if (fSource) r = r.filter((p) => p.source === fSource);
    if (fMethod) r = r.filter((p) => p.paymentMethod === fMethod);
    if (fIssueFrom) {
      const d = new Date(fIssueFrom);
      r = r.filter((p) => new Date(p.issueDate) >= d);
    }
    if (fIssueTo) {
      const d = new Date(fIssueTo);
      d.setHours(23, 59, 59, 999);
      r = r.filter((p) => new Date(p.issueDate) <= d);
    }
    const tmin = fTotalMin === "" ? null : Number(fTotalMin);
    const tmax = fTotalMax === "" ? null : Number(fTotalMax);
    if (tmin !== null && !Number.isNaN(tmin)) r = r.filter((p) => p.total >= tmin);
    if (tmax !== null && !Number.isNaN(tmax)) r = r.filter((p) => p.total <= tmax);
    return r;
  }, [
    purchases, contactsMap, statusFilter, search,
    fSupplier, fCategory, fSource, fMethod,
    fIssueFrom, fIssueTo, fTotalMin, fTotalMax,
  ]);

  const totals = {
    mes: purchases
      .filter((p) => p.issueDate >= D.daysAgo(30))
      .reduce((s, p) => s + p.total, 0),
    iva: purchases.reduce((s, p) => s + p.vat, 0),
    pendiente: purchases.filter((p) => p.status === "pendiente").reduce((s, p) => s + p.total, 0),
    vencido: purchases.filter((p) => p.status === "vencida").reduce((s, p) => s + p.total, 0),
  };

  // Opciones de proveedores (solo los que tienen al menos un gasto)
  const supplierOptions = useMemo(() => {
    const ids = new Set(purchases.map((p) => p.supplierId).filter(Boolean));
    return Array.from(ids)
      .map((id) => contactsMap.get(id as string))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [purchases, contactsMap]);

  // Categorías que aparecen en los gastos + sugeridas
  const categoryOptions = useMemo(() => {
    const used = new Set(purchases.map((p) => p.category).filter(Boolean) as string[]);
    EXPENSE_CATEGORIES.forEach((c) => used.add(c));
    return Array.from(used).sort((a, b) => a.localeCompare(b, "es"));
  }, [purchases]);

  // Export CSV
  const exportCSV = () => {
    const headers = [
      "Nº doc.", "Proveedor", "Concepto", "Categoría", "Cuenta",
      "Fecha emisión", "Fecha pago", "Método pago", "Origen",
      "Base", "IVA", "Retención IRPF %", "Retención IRPF €", "Total", "Estado",
    ];
    const rows = filtered.map((p) => {
      const sup = contactsMap.get(p.supplierId || "");
      return [
        p.number || "",
        sup?.name || "",
        p.concept || "",
        p.category || "",
        p.account || "",
        csvDate(p.issueDate),
        csvDate(p.payDate),
        p.paymentMethod || "",
        p.source || "",
        p.base,
        p.vat,
        p.retentionPct || 0,
        p.retention || 0,
        p.total,
        p.status,
      ];
    });
    downloadCSV(`gastos_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1440, margin: "0 auto" }}>
      <ComprasHeader
        section="Gastos"
        title="Gastos"
        description="Facturas recibidas y otros gastos"
        primary={{ label: "Nuevo gasto", icon: "plus", onClick: () => router.push("/compras/gastos/nuevo") }}
        onExport={exportCSV}
        exportDisabled={filtered.length === 0}
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
        <Button
          variant={showFilters || activeFilterCount > 0 ? "primary" : "ghost"}
          size="sm"
          leftIcon={<Icon name="filter" size={13} />}
          onClick={() => setShowFilters((v) => !v)}
        >
          Más filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
      </div>

      {/* Panel filtros avanzados */}
      {showFilters && (
        <Card padding={16} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Filtros avanzados
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>Limpiar todo</Button>
              )}
              <Button variant="ghost" size="iconSm" onClick={() => setShowFilters(false)} title="Cerrar">
                <Icon name="close" size={13} />
              </Button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <FilterField label="Proveedor">
              <select value={fSupplier} onChange={(e) => setFSupplier(e.target.value)} style={filterSelectStyle}>
                <option value="">Cualquiera</option>
                {supplierOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Categoría">
              <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} style={filterSelectStyle}>
                <option value="">Cualquiera</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Origen">
              <select value={fSource} onChange={(e) => setFSource(e.target.value)} style={filterSelectStyle}>
                <option value="">Cualquiera</option>
                <option value="upload">Subido manualmente</option>
                <option value="email">Recibido por email</option>
                <option value="scan">Escaneado</option>
              </select>
            </FilterField>
            <FilterField label="Método de pago">
              <select value={fMethod} onChange={(e) => setFMethod(e.target.value)} style={filterSelectStyle}>
                <option value="">Cualquiera</option>
                {PAYMENT_METHODS_PURCHASE.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Fecha emisión (desde – hasta)">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Input type="date" value={fIssueFrom} onChange={(e) => setFIssueFrom(e.target.value)} />
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>–</span>
                <Input type="date" value={fIssueTo} onChange={(e) => setFIssueTo(e.target.value)} />
              </div>
            </FilterField>
            <FilterField label="Total (€)">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Input type="number" value={fTotalMin} onChange={(e) => setFTotalMin(e.target.value)} placeholder="mín" />
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>–</span>
                <Input type="number" value={fTotalMax} onChange={(e) => setFTotalMax(e.target.value)} placeholder="máx" />
              </div>
            </FilterField>
          </div>
        </Card>
      )}

      <Card padding={0} style={{ overflow: "visible" }}>
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

// ---- Helpers UI ----
function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={{
        fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const filterSelectStyle: React.CSSProperties = {
  height: 34, width: "100%", padding: "0 10px",
  border: "1px solid var(--border)", borderRadius: 7,
  background: "var(--surface)", outline: "none", fontSize: 13, fontFamily: "inherit",
};
