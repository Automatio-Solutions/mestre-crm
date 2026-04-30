/**
 * Cálculos fiscales derivados de facturas (ventas) y compras (gastos).
 *
 * Estos helpers consumen los datos ya almacenados en Supabase (invoices + purchases)
 * para presentar un resumen de modelo (303, 130, 111…) por trimestre y un resumen
 * global de IVA por tipo.
 *
 * No persisten datos: se recalculan en memoria a partir de las hooks correspondientes.
 */

import type { Invoice, InvoiceLine } from "@/lib/db/invoices";
import type { Purchase } from "@/lib/db/purchases";

// ============================================================
// Trimestres
// ============================================================

export type Quarter = 1 | 2 | 3 | 4;

export const QUARTER_LABELS: Record<Quarter, string> = {
  1: "1 Trimestre",
  2: "2 Trimestre",
  3: "3 Trimestre",
  4: "4 Trimestre",
};

export const getQuarter = (date: Date): Quarter =>
  (Math.ceil((date.getMonth() + 1) / 3) as Quarter);

/** [start, end) del trimestre indicado del año dado. */
export const getQuarterRange = (year: number, q: Quarter): { start: Date; end: Date } => {
  const startMonth = (q - 1) * 3;
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 1),
  };
};

// ============================================================
// Helpers de líneas de factura
// ============================================================

const lineSubtotal = (l: InvoiceLine) =>
  l.quantity * l.price * (1 - (l.discount || 0) / 100);

const lineVat = (l: InvoiceLine) =>
  lineSubtotal(l) * ((l.vat || 0) / 100);

/** IVA total de una factura sumando líneas (más fiable que el campo agregado). */
export const invoiceVat = (inv: Invoice): number => {
  if (inv.lines && inv.lines.length > 0) {
    return inv.lines.reduce((s, l) => s + lineVat(l), 0);
  }
  // Fallback si no hay líneas: base × vatPct
  return inv.base * ((inv.vatPct || 0) / 100);
};

/** Base imponible total de una factura. */
export const invoiceBase = (inv: Invoice): number => {
  if (inv.lines && inv.lines.length > 0) {
    return inv.lines.reduce((s, l) => s + lineSubtotal(l), 0);
  }
  return inv.base;
};

// ============================================================
// Modelo 303 — IVA trimestral (o mensual)
// ============================================================

export interface QuarterlyIvaRow {
  quarter: Quarter;
  ivaSoportado: number;   // de compras
  ivaRepercutido: number; // de ventas
  resultado: number;      // repercutido - soportado
}

/** Sólo facturas que cuentan para Hacienda (no borradores). */
const COMPUTABLE_INVOICE_STATUSES = new Set(["pendiente", "enviada", "pagada", "vencida"]);

export function calc303Quarterly(
  invoices: Invoice[],
  purchases: Purchase[],
  year: number,
): QuarterlyIvaRow[] {
  const rows: QuarterlyIvaRow[] = [1, 2, 3, 4].map((q) => ({
    quarter: q as Quarter,
    ivaSoportado: 0,
    ivaRepercutido: 0,
    resultado: 0,
  }));

  invoices.forEach((inv) => {
    if (inv.issueDate.getFullYear() !== year) return;
    if (!COMPUTABLE_INVOICE_STATUSES.has(inv.status)) return;
    const q = getQuarter(inv.issueDate);
    rows[q - 1].ivaRepercutido += invoiceVat(inv);
  });

  purchases.forEach((p) => {
    if (p.issueDate.getFullYear() !== year) return;
    if (p.status === "borrador") return;
    const q = getQuarter(p.issueDate);
    rows[q - 1].ivaSoportado += p.vat || 0;
  });

  rows.forEach((row) => {
    row.resultado = row.ivaRepercutido - row.ivaSoportado;
  });

  return rows;
}

// ============================================================
// Resumen de impuestos por tipo de IVA
// ============================================================

export interface TaxSummaryRow {
  vatPct: number;     // 21, 10, 4, 0…
  base: number;       // subtotal sobre el que se aplica
  importe: number;    // IVA resultante
}

export interface TaxSummary {
  ventas: TaxSummaryRow[];
  compras: TaxSummaryRow[];
}

/** Agrega importes por tipo de IVA en ventas y compras durante el año. */
export function calcTaxSummary(
  invoices: Invoice[],
  purchases: Purchase[],
  year: number,
): TaxSummary {
  const ventas = new Map<number, { base: number; importe: number }>();
  const compras = new Map<number, { base: number; importe: number }>();

  invoices.forEach((inv) => {
    if (inv.issueDate.getFullYear() !== year) return;
    if (!COMPUTABLE_INVOICE_STATUSES.has(inv.status)) return;
    if (inv.lines && inv.lines.length > 0) {
      inv.lines.forEach((l) => {
        const sub = lineSubtotal(l);
        const imp = lineVat(l);
        const cur = ventas.get(l.vat || 0) || { base: 0, importe: 0 };
        cur.base += sub;
        cur.importe += imp;
        ventas.set(l.vat || 0, cur);
      });
    } else {
      const cur = ventas.get(inv.vatPct || 0) || { base: 0, importe: 0 };
      cur.base += inv.base;
      cur.importe += invoiceVat(inv);
      ventas.set(inv.vatPct || 0, cur);
    }
  });

  purchases.forEach((p) => {
    if (p.issueDate.getFullYear() !== year) return;
    if (p.status === "borrador") return;
    const cur = compras.get(p.vatPct || 0) || { base: 0, importe: 0 };
    cur.base += p.base;
    cur.importe += p.vat || 0;
    compras.set(p.vatPct || 0, cur);
  });

  const sortDesc = (a: TaxSummaryRow, b: TaxSummaryRow) => b.vatPct - a.vatPct;

  return {
    ventas: Array.from(ventas.entries())
      .map(([vatPct, v]) => ({ vatPct, ...v }))
      .sort(sortDesc),
    compras: Array.from(compras.entries())
      .map(([vatPct, v]) => ({ vatPct, ...v }))
      .sort(sortDesc),
  };
}

// ============================================================
// Detección del tipo de modelo a partir del código
// ============================================================

/** Indica si un modelo se debe presentar con desglose trimestral en pantalla. */
export const isQuarterlyIvaModel = (code: string): boolean => {
  const c = code.trim().toLowerCase();
  return c === "303" || c === "303t" || c.startsWith("303 trim");
};

/** Años disponibles a partir del histórico (incluye siempre el año actual). */
export function availableYears(invoices: Invoice[], purchases: Purchase[]): number[] {
  const set = new Set<number>([new Date().getFullYear()]);
  invoices.forEach((i) => set.add(i.issueDate.getFullYear()));
  purchases.forEach((p) => set.add(p.issueDate.getFullYear()));
  return Array.from(set).sort((a, b) => b - a);
}
