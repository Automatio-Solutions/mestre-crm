import { CATEGORIES_HINT } from "./types";

/**
 * Prompt de extracción para Claude Vision.
 *
 * Le pedimos al modelo:
 *  - JSON estricto, sin texto extra
 *  - campos en null si no son legibles
 *  - aviso explícito de problemas en `warnings`
 */
export const SCAN_SYSTEM_PROMPT = `
Eres un extractor preciso de datos de tickets, recibos y facturas españolas.
Devuelves SOLO un objeto JSON válido, sin texto antes ni después, sin markdown,
sin bloques de código.

Conoce el contexto fiscal español:
- IVA habitual: 21%, 10%, 4%, 0%
- NIF/CIF: empresa "letra + 8 dígitos" (B12345678) o autónomo "8 dígitos + letra" (12345678A)
- Fechas en formato DD/MM/YYYY o D-M-YY → convertir a YYYY-MM-DD

Si un campo no se puede leer con seguridad, déjalo en null y añade un aviso a "warnings".
NO inventes datos. Mejor null que un valor incorrecto.

Categorías sugeridas (elige la más adecuada o null):
${CATEGORIES_HINT.join(", ")}.
`.trim();

export const SCAN_USER_PROMPT = `
Extrae los datos de este documento y devuelve un JSON con exactamente esta forma:

{
  "supplierName": string | null,        // nombre comercial del proveedor
  "supplierNif": string | null,         // NIF/CIF si aparece, sin espacios ni guiones
  "date": string | null,                // YYYY-MM-DD
  "number": string | null,              // nº de factura o ticket
  "base": number | null,                // base imponible (sin IVA)
  "vat": number | null,                 // importe del IVA
  "vatPct": number | null,              // 21, 10, 4 o 0
  "total": number | null,               // total con IVA
  "category": string | null,            // categoría sugerida (lista del system prompt)
  "concept": string | null,             // descripción breve en una línea
  "confidence": number,                 // 0..1, lo seguro que estás de la extracción global
  "warnings": string[]                  // problemas concretos detectados
}

Reglas finales:
- Usa punto decimal (no coma) en todos los números.
- Si solo ves el total (típico ticket pequeño), calcula la base y el IVA usando el vatPct dominante del documento. Si no puedes inferir el tipo, deja base/vat/vatPct en null y avisa.
- Si el documento contiene varios tipos de IVA, devuelve los totales globales y avísalo en warnings.
- Si el archivo no es legible o no es un documento contable (ej. una foto cualquiera), devuelve todos los campos en null, confidence 0 y un aviso descriptivo.
`.trim();
