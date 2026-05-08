import { CATEGORIES_HINT } from "./types";

/**
 * Prompt de extracción para Claude Vision.
 *
 * Le pedimos al modelo:
 *  - JSON estricto, sin texto extra
 *  - campos en null si no son legibles
 *  - aviso explícito de problemas en `warnings`
 *  - desglose de líneas cuando el documento tiene varios conceptos o tipos de IVA
 *  - retención IRPF si la factura la incluye (típico en autónomos profesionales)
 */
export const SCAN_SYSTEM_PROMPT = `
Eres un extractor preciso de datos de tickets, recibos y facturas españolas.
Devuelves SOLO un objeto JSON válido, sin texto antes ni después, sin markdown,
sin bloques de código.

Conoce el contexto fiscal español:
- IVA habitual: 21%, 10%, 4%, 0%
- Retención IRPF habitual en facturas de profesionales/autónomos: 15% (general),
  7% (nuevos autónomos los 3 primeros años), 19%/24% (alquileres y otros).
  Aparece como "Retención", "Ret.", "IRPF", "-15%" en negativo, etc.
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
  "base": number | null,                // base imponible TOTAL del documento
  "vat": number | null,                 // importe IVA TOTAL del documento
  "vatPct": number | null,              // tipo IVA dominante (21/10/4/0). null si mixto.
  "retentionPct": number | null,        // % retención IRPF (15/7/19/24…). 0 o null si no hay.
  "retention": number | null,           // importe retenido en € (positivo). 0 o null si no hay.
  "total": number | null,               // total documento = base + IVA - retención
  "category": string | null,            // categoría sugerida (lista del system prompt)
  "concept": string | null,             // descripción global breve en una línea
  "lines": [                            // detalle por línea (ver reglas abajo)
    {
      "concept": string,                // nombre/concepto del producto o servicio
      "description": string | null,     // descripción extra opcional
      "quantity": number,               // cantidad (1 si no se indica)
      "price": number,                  // precio unitario sin IVA
      "vat": number,                    // % IVA de la línea (21, 10, 4, 0)
      "discount": number                // % descuento aplicado a la línea (0 si no hay)
    }
  ],
  "confidence": number,                 // 0..1, lo seguro que estás de la extracción global
  "warnings": string[]                  // problemas concretos detectados
}

Reglas finales:
- Usa punto decimal (no coma) en todos los números.
- Si solo ves el total (típico ticket pequeño), calcula la base y el IVA usando el vatPct dominante del documento. Si no puedes inferir el tipo, deja base/vat/vatPct en null y avisa.
- Líneas:
  - Si el documento solo describe UN concepto (típico ticket de una compra, suscripción mensual…), devuelve "lines": [] y deja los totales globales en base/vat/total.
  - Si el documento tiene VARIAS líneas distintas (factura con tabla de productos/servicios), devuelve cada una en "lines" y además los totales agregados en base/vat/total. Importante: la suma de las líneas debe coincidir aproximadamente con los totales globales.
  - Cuando hay varios tipos de IVA, vatPct global = el dominante (el que más base aporta) y avísalo en warnings ("IVA mixto").
- Retención:
  - Si en el documento aparece retención IRPF, ponla en "retentionPct" (porcentaje) y "retention" (importe positivo en €).
  - El "total" final = base + iva - retention. Verifícalo.
  - Si no hay retención: retentionPct = 0, retention = 0.
- Si el archivo no es legible o no es un documento contable (ej. una foto cualquiera), devuelve todos los campos numéricos en null, lines: [], confidence 0 y un aviso descriptivo.
`.trim();
