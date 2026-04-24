"use client";
import type { Quote } from "@/lib/db/quotes";
import { generatePdfFromElement } from "./generatePdf";

export async function generateQuotePdf(
  element: HTMLElement,
  quote: Quote,
  opts: { filename?: string; download?: boolean } = {}
): Promise<Blob> {
  const filename = opts.filename || `presupuesto-${quote.number.replace(/\//g, "-")}.pdf`;
  return generatePdfFromElement(element, { ...opts, filename });
}
