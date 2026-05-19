"use client";
import { Fragment, useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Icon, Avatar, Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui";
import { useContacts } from "@/lib/db/useContacts";
import { useClientSpaces } from "@/lib/db/useClientSpaces";
import { useInvoices } from "@/lib/db/useInvoices";
import { useQuotes } from "@/lib/db/useQuotes";
import { usePurchases } from "@/lib/db/usePurchases";
import { useTasks } from "@/lib/db/useTasks";
import { useTaxModels } from "@/lib/db/useTaxModels";
import { useAuth } from "@/lib/auth/AuthContext";
import { deriveNotifications, type Notification } from "@/lib/notifications";
import * as DMData from "@/lib/data";

const labelMap: Record<string, string> = {
  "": "Inicio",
  contactos: "Contactos",
  ventas: "Ventas",
  compras: "Compras",
  contabilidad: "Contabilidad",
  impuestos: "Impuestos",
  analitica: "Analítica",
  clientes: "Espacio de trabajo",
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

// ============================================================
// Notifications dropdown
// Deriva notificaciones de tareas / facturas / modelos fiscales
// para el usuario logueado.
// ============================================================
const severityColor: Record<Notification["severity"], string> = {
  error: "var(--error)",
  warning: "#C89B3C",
  info: "var(--purple)",
};
const severityBg: Record<Notification["severity"], string> = {
  error: "#F5E1E1",
  warning: "#FAF1DC",
  info: "var(--purple-soft)",
};

// Persistencia de notificaciones descartadas, por usuario, en localStorage.
function useDismissedNotifications(userId: string | undefined) {
  const storageKey = userId ? `dm-crm-notif-dismissed-${userId}` : null;
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Cargar al montar / cuando cambia el userId
  useEffect(() => {
    if (!storageKey) {
      setDismissed(new Set());
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setDismissed(new Set(JSON.parse(raw)));
      else setDismissed(new Set());
    } catch {
      setDismissed(new Set());
    }
  }, [storageKey]);

  const persist = useCallback((next: Set<string>) => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {}
  }, [storageKey]);

  const dismiss = useCallback((ids: string[]) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      persist(next);
      return next;
    });
  }, [persist]);

  const clearAll = useCallback(() => {
    setDismissed(new Set());
    if (storageKey) {
      try { window.localStorage.removeItem(storageKey); } catch {}
    }
  }, [storageKey]);

  return { dismissed, dismiss, clearAll };
}

function NotificationsDropdown() {
  const router = useRouter();
  const { user, hasScope } = useAuth();
  const { tasks } = useTasks();
  const { invoices } = useInvoices();
  const { taxModels } = useTaxModels();

  const userRef = user?.userRef || null;
  const { dismissed, dismiss, clearAll } = useDismissedNotifications(user?.id);

  // Cada fuente de notificación se gatea por el scope correspondiente.
  // Así, un usuario con solo "proyectos" no recibe alertas de facturas
  // ni de impuestos (no tiene acceso a esas pantallas).
  const taskItems = hasScope("proyectos") ? tasks : [];
  const invoiceItems = hasScope("ventas") ? invoices : [];
  const taxItems = hasScope("impuestos") ? taxModels : [];

  const allNotifications = useMemo(
    () => deriveNotifications({
      userRef,
      tasks: taskItems,
      invoices: invoiceItems,
      taxModels: taxItems,
    }),
    [userRef, taskItems, invoiceItems, taxItems],
  );

  // Filtra las descartadas. Si ya no están en la lista derivada (porque
  // la causa raíz se resolvió), limpiamos automáticamente del set.
  const notifications = useMemo(
    () => allNotifications.filter((n) => !dismissed.has(n.id)),
    [allNotifications, dismissed],
  );

  const count = notifications.length;
  const hasError = notifications.some((n) => n.severity === "error");

  return (
    <Dropdown
      align="end"
      width={380}
      trigger={
        <button
          title="Notificaciones"
          style={{
            position: "relative",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: 8,
            background: "transparent", color: "var(--text-muted)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--beige-bg)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <Icon name="bell" size={16} />
          {count > 0 && (
            <span style={{
              position: "absolute", top: 4, right: 4,
              minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999,
              background: hasError ? "var(--error)" : "var(--purple)",
              color: "#fff", fontSize: 10, fontWeight: 600,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1,
            }}>
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      }
    >
      <div style={{
        padding: "10px 14px 8px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Notificaciones</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {count === 0
              ? "Estás al día"
              : `${count} pendiente${count === 1 ? "" : "s"}`}
          </div>
        </div>
        {count > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismiss(notifications.map((n) => n.id));
            }}
            style={{
              fontSize: 11, fontWeight: 500, color: "var(--purple)",
              padding: "4px 8px", borderRadius: 6,
              background: "transparent",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--purple-soft)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            title="Descartar todas las notificaciones visibles"
          >
            Marcar todas como vistas
          </button>
        )}
      </div>

      {count === 0 ? (
        <div style={{ padding: "28px 14px", textAlign: "center", color: "var(--text-muted)" }}>
          <Icon name="bell" size={20} style={{ opacity: 0.4 }} />
          <div style={{ fontSize: 12.5, marginTop: 8 }}>
            {userRef
              ? "No tienes notificaciones nuevas."
              : "Asigna tu user_ref para ver tus tareas aquí."}
          </div>
        </div>
      ) : (
        <div style={{ maxHeight: 420, overflow: "auto", padding: 4 }}>
          {notifications.slice(0, 20).map((n) => (
            <button
              key={n.id}
              onClick={() => { dismiss([n.id]); router.push(n.href); }}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                width: "100%", padding: "10px 12px", borderRadius: 7,
                background: "transparent", textAlign: "left",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{
                flexShrink: 0,
                width: 26, height: 26, borderRadius: 6,
                background: severityBg[n.severity],
                color: severityColor[n.severity],
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={n.icon} size={12} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 500,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  color: "var(--text)",
                }}>
                  {n.title}
                </div>
                {n.subtitle && (
                  <div style={{
                    fontSize: 11.5, color: "var(--text-muted)", marginTop: 2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {n.subtitle}
                  </div>
                )}
              </div>
            </button>
          ))}
          {notifications.length > 20 && (
            <div style={{
              padding: "8px 12px", fontSize: 11, color: "var(--text-muted)",
              textAlign: "center", borderTop: "1px solid var(--border)",
            }}>
              y {notifications.length - 20} más
            </div>
          )}
        </div>
      )}
    </Dropdown>
  );
}

// ============================================================
// User dropdown (Ajustes + Cerrar sesión)
// ============================================================
function UserDropdown() {
  const { user, logout } = useAuth();
  const teamUser =
    (user?.userRef ? (DMData as any).userById?.(user.userRef) : null) ||
    (DMData as any).USERS?.[0];
  const displayName = user?.name || teamUser?.name || "—";
  const displayEmail = user?.email || "";

  return (
    <Dropdown
      align="end"
      width={240}
      trigger={
        <button
          title={displayName}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: 3, borderRadius: 999,
            background: "transparent", border: "none", cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--beige-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Avatar user={teamUser} size={30} />
        </button>
      }
    >
      <div style={{
        padding: "10px 12px 12px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <Avatar user={teamUser} size={32} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 13, fontWeight: 500,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {displayName}
          </div>
          {displayEmail && (
            <div style={{
              fontSize: 11.5, color: "var(--text-muted)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {displayEmail}
            </div>
          )}
        </div>
      </div>
      <DropdownItem leftIcon={<Icon name="settings" size={13} />}>
        Ajustes
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem
        danger
        leftIcon={<Icon name="x" size={13} />}
        onClick={logout}
      >
        Cerrar sesión
      </DropdownItem>
    </Dropdown>
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
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <NotificationsDropdown />
        <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 6px" }} />
        <UserDropdown />
      </div>
    </header>
  );
}

const kbd: React.CSSProperties = {
  padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 4,
  background: "var(--bg)", fontFamily: "var(--font-ui)",
};
