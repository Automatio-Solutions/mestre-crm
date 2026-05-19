export type NavScope =
  | "dashboard" | "contactos" | "ventas" | "compras"
  | "contabilidad" | "impuestos" | "analitica" | "proyectos";

export interface NavChild {
  id: string;
  label: string;
  path: string;
}
export interface NavItemDef {
  id: string;
  label: string;
  icon: string;
  path: string;
  section?: "proyectos";
  /** Scope requerido para ver este item. */
  scope: NavScope;
  children?: NavChild[];
}
export interface NavSeparator {
  type: "sep";
}
export type NavEntry = NavItemDef | NavSeparator;

export const NAV: NavEntry[] = [
  { id: "dashboard", label: "Inicio", icon: "home", path: "/", scope: "dashboard" },
  { id: "contactos", label: "Contactos", icon: "users", path: "/contactos", scope: "contactos" },
  {
    id: "ventas", label: "Ventas", icon: "receipt", path: "/ventas", scope: "ventas",
    children: [
      { id: "facturas", label: "Facturas", path: "/ventas/facturas" },
      { id: "presupuestos", label: "Presupuestos", path: "/ventas/presupuestos" },
      { id: "proformas", label: "Proformas", path: "/ventas/proformas" },
      { id: "servicios", label: "Servicios", path: "/ventas/servicios" },
    ],
  },
  {
    id: "compras", label: "Compras", icon: "shopping", path: "/compras", scope: "compras",
    children: [
      { id: "gastos", label: "Gastos", path: "/compras/gastos" },
      { id: "nominas", label: "Nóminas", path: "/compras/nominas" },
      { id: "escaner", label: "Escáner", path: "/compras/escaner" },
    ],
  },
  {
    id: "contabilidad", label: "Contabilidad", icon: "book", path: "/contabilidad", scope: "contabilidad",
    children: [
      { id: "cuadro", label: "Cuadro de cuentas", path: "/contabilidad/cuadro-cuentas" },
      { id: "diario", label: "Libro diario", path: "/contabilidad/libro-diario" },
      { id: "pyg", label: "Pérdidas y ganancias", path: "/contabilidad/perdidas-ganancias" },
      { id: "balance", label: "Balance de situación", path: "/contabilidad/balance-situacion" },
    ],
  },
  { id: "impuestos", label: "Impuestos", icon: "landmark", path: "/impuestos", scope: "impuestos" },
  { id: "analitica", label: "Analítica", icon: "chart", path: "/analitica", scope: "analitica" },
  { type: "sep" },
  { id: "clientes", label: "Espacio de trabajo", icon: "folder", path: "/clientes", section: "proyectos", scope: "proyectos" },
];

/**
 * Mapea un pathname a su scope requerido. Devuelve null si la ruta es
 * pública o no requiere scope (login, portal, api auth).
 */
export function scopeForPath(pathname: string): NavScope | null {
  // El Inicio siempre está accesible. Dashboard.tsx elige internamente
  // qué variante renderizar según los scopes del usuario.
  if (pathname === "/") return null;
  if (pathname.startsWith("/contactos")) return "contactos";
  if (pathname.startsWith("/ventas")) return "ventas";
  if (pathname.startsWith("/compras")) return "compras";
  if (pathname.startsWith("/contabilidad")) return "contabilidad";
  if (pathname.startsWith("/impuestos")) return "impuestos";
  if (pathname.startsWith("/analitica")) return "analitica";
  if (pathname.startsWith("/clientes")) return "proyectos";
  return null;
}

export function isNavItem(e: NavEntry): e is NavItemDef {
  return (e as NavSeparator).type !== "sep";
}
