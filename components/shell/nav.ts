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
  children?: NavChild[];
}
export interface NavSeparator {
  type: "sep";
}
export type NavEntry = NavItemDef | NavSeparator;

export const NAV: NavEntry[] = [
  { id: "dashboard", label: "Inicio", icon: "home", path: "/" },
  { id: "contactos", label: "Contactos", icon: "users", path: "/contactos" },
  {
    id: "ventas", label: "Ventas", icon: "receipt", path: "/ventas",
    children: [
      { id: "facturas", label: "Facturas", path: "/ventas/facturas" },
      { id: "presupuestos", label: "Presupuestos", path: "/ventas/presupuestos" },
      { id: "proformas", label: "Proformas", path: "/ventas/proformas" },
      { id: "servicios", label: "Servicios", path: "/ventas/servicios" },
    ],
  },
  {
    id: "compras", label: "Compras", icon: "shopping", path: "/compras",
    children: [
      { id: "gastos", label: "Gastos", path: "/compras/gastos" },
      { id: "nominas", label: "Nóminas", path: "/compras/nominas" },
      { id: "escaner", label: "Escáner", path: "/compras/escaner" },
    ],
  },
  {
    id: "contabilidad", label: "Contabilidad", icon: "book", path: "/contabilidad",
    children: [
      { id: "cuadro", label: "Cuadro de cuentas", path: "/contabilidad/cuadro-cuentas" },
      { id: "diario", label: "Libro diario", path: "/contabilidad/libro-diario" },
      { id: "pyg", label: "Pérdidas y ganancias", path: "/contabilidad/perdidas-ganancias" },
      { id: "balance", label: "Balance de situación", path: "/contabilidad/balance-situacion" },
    ],
  },
  { id: "impuestos", label: "Impuestos", icon: "landmark", path: "/impuestos" },
  { id: "analitica", label: "Analítica", icon: "chart", path: "/analitica" },
  { type: "sep" },
  { id: "clientes", label: "Clientes", icon: "folder", path: "/clientes", section: "proyectos" },
];

export function isNavItem(e: NavEntry): e is NavItemDef {
  return (e as NavSeparator).type !== "sep";
}
