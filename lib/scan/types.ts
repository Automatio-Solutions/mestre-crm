/**
 * Línea de la factura tal y como la devuelve el OCR.
 * Forma compatible con InvoiceLine / PurchaseLine para mapear directo a la BD.
 */
export interface ScanLine {
  concept: string;
  description?: string | null;
  quantity: number;
  price: number;       // precio unitario
  vat: number;         // % IVA de la línea
  discount?: number;   // % descuento línea
}

/**
 * Resultado de la extracción de un ticket o factura.
 * Lo que devuelve Claude Vision.
 */
export interface ScanResult {
  supplierName: string | null;
  supplierNif: string | null;
  date: string | null;          // YYYY-MM-DD
  number: string | null;        // nº factura/ticket
  base: number | null;          // base imponible total
  vat: number | null;           // importe IVA total
  vatPct: number | null;        // 21 / 10 / 4 / 0 (dominante; null si mixto)
  retentionPct: number | null;  // % IRPF (15, 7…); null si no aplica
  retention: number | null;     // importe retenido €
  total: number | null;         // total documento (base + iva - retención)
  category: string | null;
  concept: string | null;
  lines: ScanLine[];            // [] si solo hay un concepto
  confidence: number;           // 0..1
  warnings: string[];           // ej. ["imagen borrosa", "NIF no visible"]
}

export type ScanModel = "haiku" | "sonnet";

export interface ScanRequestMeta {
  model?: ScanModel;
}

export interface ScanResponse {
  ok: true;
  result: ScanResult;
  modelUsed: string;
  rawText?: string;        // por si falla parseo y quieres depurar
}

export interface ScanErrorResponse {
  ok: false;
  error: string;
}

export const CATEGORIES_HINT = [
  "combustible",
  "software",
  "alimentación",
  "oficina",
  "transporte",
  "restaurante",
  "suministros",
  "formación",
  "profesionales",
  "mantenimiento",
  "telefonía",
  "publicidad",
  "otros",
] as const;
