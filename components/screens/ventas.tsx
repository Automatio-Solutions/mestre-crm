// Re-exports para compatibilidad con compras-escaner.tsx y contabilidad-impuestos-analitica.tsx,
// que importaban StatCard/Toggle desde "./ventas".
// La pantalla principal de Ventas vive ahora en components/screens/ventas/*.
export { StatCard, Toggle, VentasHeader } from "./ventas/shared";
