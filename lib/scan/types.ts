/**
 * Resultado de la extracción de un ticket o factura.
 * Lo que devuelve Claude Vision.
 */
export interface ScanResult {
  supplierName: string | null;
  supplierNif: string | null;
  date: string | null;          // YYYY-MM-DD
  number: string | null;        // nº factura/ticket
  base: number | null;          // base imponible
  vat: number | null;           // importe IVA
  vatPct: number | null;        // 21 / 10 / 4 / 0
  total: number | null;
  category: string | null;
  concept: string | null;
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
