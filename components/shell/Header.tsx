"use client";
import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Avatar, Button } from "@/components/ui";
import { useContacts } from "@/lib/db/useContacts";
import { useClientSpaces } from "@/lib/db/useClientSpaces";
import { useInvoices } from "@/lib/db/useInvoices";
import { useQuotes } from "@/lib/db/useQuotes";
import { usePurchases } from "@/lib/db/usePurchases";
import * as DMData from "@/lib/data";

const labelMap: Record<string, string> = {
  "": "Inicio",
  contactos: "Contactos",
  ventas: "Ventas",
  compras: "Compras",
  contabilidad: "Contabilidad",
  impuestos: "Impuestos",
  analitica: "Analítica",
  clientes: "Clientes",
  facturas: "Facturas",
  presupuestos: "Presupuestos",
  proformas: "Proformas",
  servicios: "Servicios",
  recurrentes: "Recurrentes",
  remesas: "Remesas SEPA",
  escaner: "Escáner",
  gastos: "Gastos",
  proveedores: "Proveedores",
  nominas: "Nóminas",
  nuevo: "Nuevo",
  nueva: "Nueva",
  editar: "Editar",
  "cuadro-cuentas": "Cuadro de cuentas",
  "libro-diario": "Libro diario",
  "perdidas-ganancias": "Pérdidas y ganancias",
  "balance-situacion": "Balance",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// IDs técnicos tipo "f-ab12", "p-xy", "c-abc", "q-123", "cs-xy", "m-xy", "s-xy", etc.
const isTechnicalId = (s: string) => /^[a-z]{1,3}-[a-zA-Z0-9]+$/.test(s) || /^[0-9]+$/.test(s);

function Breadcrumbs({ route }: { route: string }) {
  // Leemos los hooks a nivel de navegación: ya están cacheados por el AppShell
  // gracias a que los data layers viven en memoria por componente.
  const { contacts } = useContacts();
  const { spaces } = useClientSpaces();
  const { invoices } = useInvoices();
  const { quotes } = useQuotes();
  const { purchases } = usePurchases();

  const parts = route.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [{ label: "Inicio", path: "/" }];
  const D = DMData as any;

  parts.forEach((p, i) => {
    const path = "/" + parts.slice(0, i + 1).join("/");
    const parent = parts[i - 1];

    // 1) Mapa estático (ventas, compras, gastos, nuevo, editar, etc.)
    let label: string | undefined = labelMap[p];

    // 2) IDs con contexto según el padre
    if (!label) {
      if (parent === "contactos") {
        const c = contacts.find((x) => x.id === p);
        if (c) label = c.name;
      } else if (parent === "clientes") {
        const s = spaces.find((x) => x.id === p);
        if (s) label = s.name;
        else {
          // caer a mock antiguo por si acaso
          const m = D?.CLIENT_SPACES?.find((x: any) => x.id === p);
          if (m) label = m.name;
        }
      } else if (parent && spaces.find((s) => s.id === parent)) {
        // /clientes/[clientId]/[moduleId]
        const parentSpace = spaces.find((s) => s.id === parent);
        const mod = parentSpace?.modules.find((m) => m.id === p);
        if (mod) label = mod.name;
      } else if (parent === "facturas") {
        const inv = invoices.find((x) => x.id === p);
        if (inv) label = inv.number;
      } else if (parent === "presupuestos") {
        const q = quotes.find((x) => x.id === p);
        if (q) label = q.number;
      } else if (parent === "gastos") {
        const g = purchases.find((x) => x.id === p);
        if (g) label = g.number || "Gasto";
      }
    }

    // 3) Fallbacks
    if (!label) {
      if (isTechnicalId(p)) label = "Detalle";
      else label = capitalize(p);
    }

    crumbs.push({ label, path });
  });

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        const labelEl = (
          <span
            style={{
              color: isLast ? "var(--text)" : "var(--text-muted)",
              fontWeight: isLast ? 500 : 400,
            }}
          >
            {c.label}
          </span>
        );
        return (
          <Fragment key={c.path + "-" + i}>
            {i > 0 && <Icon name="chevronRight" size={12} style={{ opacity: 0.5 }} />}
            {isLast ? (
              labelEl
            ) : (
              <Link
                href={c.path}
                style={{
                  padding: "2px 6px",
                  margin: "-2px -6px",
                  borderRadius: 4,
                  transition: "background 140ms ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {labelEl}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

export function Header({ onOpenCmd }: { onOpenCmd: () => void }) {
  const pathname = usePathname() || "/";
  return (
    <header
      style={{
        height: 64, flexShrink: 0, padding: "0 24px",
        borderBottom: "1px solid var(--border)", background: "var(--bg)",
        display: "flex", alignItems: "center", gap: 20,
        position: "sticky", top: 0, zIndex: 15, backdropFilter: "blur(8px)",
      }}
    >
      <Breadcrumbs route={pathname} />
      <div style={{ flex: 1, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
        <button
          onClick={onOpenCmd}
          className="dm-focus"
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            height: 36, padding: "0 12px", borderRadius: 9,
            background: "var(--surface)", border: "1px solid var(--border)",
            color: "var(--text-muted)", fontSize: 13,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <Icon name="search" size={15} />
          <span>Buscar en todo el workspace…</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 4, fontSize: 11, color: "var(--text-faint)" }}>
            <kbd style={kbd}>⌘</kbd>
            <kbd style={kbd}>K</kbd>
          </span>
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button variant="ghost" size="icon"><Icon name="bell" size={16} /></Button>
        <Button variant="ghost" size="icon"><Icon name="settings" size={16} /></Button>
        <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />
        <Avatar user={DMData.USERS[0]} size={32} />
      </div>
    </header>
  );
}

const kbd: React.CSSProperties = {
  padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 4,
  background: "var(--bg)", fontFamily: "var(--font-ui)",
};
