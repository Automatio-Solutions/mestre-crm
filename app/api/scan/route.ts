/**
 * Endpoint de escaneo de tickets/facturas con Claude Vision.
 *
 * Recibe FormData con un archivo y un campo opcional `model` ("haiku"|"sonnet").
 * Devuelve un JSON con la extracción estructurada (ScanResult).
 *
 * La API key vive solo aquí (server-side). Nunca llega al navegador.
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SCAN_SYSTEM_PROMPT, SCAN_USER_PROMPT } from "@/lib/scan/prompt";
import type { ScanResponse, ScanErrorResponse, ScanResult } from "@/lib/scan/types";

// Estos modelos son alias hacia las versiones más recientes:
const MODELS = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-5",
} as const;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC = ["application/pdf"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return errorResponse("Falta ANTHROPIC_API_KEY en el servidor.", 500);
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const modelKey = (formData.get("model") as string) || "haiku";
    const model = MODELS[modelKey as keyof typeof MODELS] || MODELS.haiku;

    if (!(file instanceof File)) {
      return errorResponse("No se recibió ningún archivo.", 400);
    }
    if (file.size === 0) {
      return errorResponse("El archivo está vacío.", 400);
    }
    if (file.size > MAX_BYTES) {
      return errorResponse(
        `El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máx: 15 MB.`,
        400
      );
    }

    const mediaType = file.type;
    const isImage = ALLOWED_IMAGE.includes(mediaType);
    const isPdf = ALLOWED_DOC.includes(mediaType);
    if (!isImage && !isPdf) {
      return errorResponse(
        `Tipo de archivo no soportado: ${mediaType}. Usa JPG, PNG, WEBP o PDF.`,
        400
      );
    }

    // Convertir a base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const anthropic = new Anthropic({ apiKey });

    // Construir contenido según tipo
    const content: Anthropic.MessageParam["content"] = isImage
      ? [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: base64,
            },
          },
          { type: "text", text: SCAN_USER_PROMPT },
        ]
      : [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          { type: "text", text: SCAN_USER_PROMPT },
        ];

    const message = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: SCAN_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    // Concatenar texto de salida
    const text = message.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();

    // Parseo robusto: a veces el modelo añade ```json o explicaciones
    const json = extractJson(text);
    if (!json) {
      return NextResponse.json<ScanErrorResponse>(
        { ok: false, error: "El modelo no devolvió un JSON válido." },
        { status: 502 }
      );
    }

    const result: ScanResult = normalizeResult(json);

    return NextResponse.json<ScanResponse>({
      ok: true,
      result,
      modelUsed: model,
      rawText: text,
    });
  } catch (e: any) {
    console.error("[/api/scan]", e);
    return errorResponse(e?.message || "Error desconocido en el escaneo.", 500);
  }
}

// ============================================================
// helpers
// ============================================================

function errorResponse(message: string, status: number) {
  return NextResponse.json<ScanErrorResponse>({ ok: false, error: message }, { status });
}

function extractJson(text: string): any | null {
  // Quitar bloques de código markdown si existen
  let s = text.trim();
  s = s.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  // Si todavía hay texto antes/después, intentar extraer { ... }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  const candidate = s.slice(first, last + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function normalizeResult(raw: any): ScanResult {
  const num = (v: any): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: any): string | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s ? s : null;
  };
  const dateStr = (v: any): string | null => {
    const s = str(v);
    if (!s) return null;
    // Acepta YYYY-MM-DD ya correcto
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // DD/MM/YYYY o D-M-YYYY
    const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
      const d = m[1].padStart(2, "0");
      const mo = m[2].padStart(2, "0");
      const y = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${y}-${mo}-${d}`;
    }
    return null;
  };

  const warningsArr: string[] = Array.isArray(raw.warnings)
    ? raw.warnings.map((w: any) => String(w)).filter(Boolean)
    : [];

  return {
    supplierName: str(raw.supplierName),
    supplierNif: str(raw.supplierNif),
    date: dateStr(raw.date),
    number: str(raw.number),
    base: num(raw.base),
    vat: num(raw.vat),
    vatPct: num(raw.vatPct),
    total: num(raw.total),
    category: str(raw.category),
    concept: str(raw.concept),
    confidence: typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0,
    warnings: warningsArr,
  };
}
