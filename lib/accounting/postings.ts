/**
 * Generación de asientos contables a partir de documentos
 * (facturas emitidas y facturas recibidas).
 *
 * El usuario decide cuándo "postear" desde la pantalla de detalle.
 * El asiento queda enlazado al documento vía source_type + source_id.
 */
import type { Invoice } from "@/lib/db/invoices";
import type { Purchase } from "@/lib/db/purchases";
import type { NewJournalEntry } from "@/lib/db/journalEntries";

// ============================================================
// Mapeo de categoría de gasto → cuenta PGC (3 dígitos)
// Las cuentas se siembran en chart_of_accounts vía PGC_ACCOUNTS.
// ============================================================
const EXPENSE_CATEGORY_ACCOUNT: Record<string, string> = {
  "Software":              "629",
  "Infraestructura":       "629",
  "Telecomunicaciones":    "629",
  "Servicios profesionales": "623",
  "Suministros":           "628",
  "Nóminas":               "640",
  "Impuestos":             "631",
  "Marketing":             "627",
  "Viajes":                "629",
  "Material oficina":      "629",
  "Otros":                 "629",
};

// Cuenta de ingreso por defecto para facturas emitidas
const DEFAULT_INCOME_ACCOUNT = "705"; // Prestaciones de servicios

// Cuenta cliente / proveedor / hacienda
const CLIENT_ACCOUNT      = "430"; // Clientes
const SUPPLIER_ACCOUNT    = "410"; // Acreedores por prestación de servicios
const VAT_OUTPUT_ACCOUNT  = "477"; // H.P. IVA repercutido
const VAT_INPUT_ACCOUNT   = "472"; // H.P. IVA soportado
const RETENTION_ACCOUNT   = "475"; // H.P. acreedora por conceptos fiscales (retenciones)

/** Devuelve el código PGC (3 dígitos) para una compra concreta. */
export const purchaseExpenseAccount = (purchase: Purchase): string => {
  // Si el usuario ha puesto explícitamente una cuenta tipo "62900001 · Otros..."
  if (purchase.account) {
    const m = purchase.account.match(/^(\d{3})/);
    if (m) return m[1];
  }
  if (purchase.category && EXPENSE_CATEGORY_ACCOUNT[purchase.category]) {
    return EXPENSE_CATEGORY_ACCOUNT[purchase.category];
  }
  return "629"; // Otros servicios — fallback
};

// ============================================================
// FACTURA EMITIDA (venta)
//
//   Debe  430  Clientes                   = total (base + iva)
//   Haber 705  Prestación de servicios    = base
//   Haber 477  H.P. IVA repercutido       = iva
// ============================================================
export function buildInvoicePosting(invoice: Invoice, clientName?: string): NewJournalEntry {
  const vatAmount = +(invoice.total - invoice.base).toFixed(2);
  const lines: NewJournalEntry["lines"] = [
    {
      accountCode: CLIENT_ACCOUNT,
      concept: `Cliente${clientName ? ` · ${clientName}` : ""}`,
      debit: invoice.total,
      credit: 0,
    },
    {
      accountCode: DEFAULT_INCOME_ACCOUNT,
      concept: invoice.concept || "Prestación de servicios",
      debit: 0,
      credit: invoice.base,
    },
  ];
  if (vatAmount > 0) {
    lines.push({
      accountCode: VAT_OUTPUT_ACCOUNT,
      concept: `IVA repercutido ${invoice.vatPct}%`,
      debit: 0,
      credit: vatAmount,
    });
  }
  return {
    date: invoice.issueDate,
    description: invoice.concept || `Factura ${invoice.number}`,
    docRef: `FV ${invoice.number}`,
    sourceType: "invoice",
    sourceId: invoice.id,
    lines,
  };
}

// ============================================================
// FACTURA RECIBIDA (compra)
//
//   Debe  6xx  Cuenta de gasto (según categoría)  = base
//   Debe  472  H.P. IVA soportado                 = iva
//   Haber 475  H.P. retenciones (si hay IRPF)     = retención
//   Haber 410  Proveedor                          = total a pagar
// ============================================================
export function buildPurchasePosting(purchase: Purchase, supplierName?: string): NewJournalEntry {
  const account = purchaseExpenseAccount(purchase);
  const vatAmount = +(purchase.vat || 0).toFixed(2);
  const retention = +(purchase.retention || 0).toFixed(2);
  const total = +purchase.total.toFixed(2);

  const lines: NewJournalEntry["lines"] = [
    {
      accountCode: account,
      concept: purchase.concept || "Gasto",
      debit: purchase.base,
      credit: 0,
    },
  ];
  if (vatAmount > 0) {
    lines.push({
      accountCode: VAT_INPUT_ACCOUNT,
      concept: `IVA soportado ${purchase.vatPct}%`,
      debit: vatAmount,
      credit: 0,
    });
  }
  if (retention > 0) {
    lines.push({
      accountCode: RETENTION_ACCOUNT,
      concept: `Retención IRPF ${purchase.retentionPct}%`,
      debit: 0,
      credit: retention,
    });
  }
  lines.push({
    accountCode: SUPPLIER_ACCOUNT,
    concept: `Proveedor${supplierName ? ` · ${supplierName}` : ""}`,
    debit: 0,
    credit: total,
  });

  return {
    date: purchase.issueDate,
    description: purchase.concept || `Gasto ${purchase.number || ""}`,
    docRef: purchase.number ? `FC ${purchase.number}` : null,
    sourceType: "purchase",
    sourceId: purchase.id,
    lines,
  };
}
