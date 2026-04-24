"use client";
import type { Invoice } from "@/lib/db/invoices";
import { generatePdfFromElement } from "./generatePdf";

export async function generateInvoicePdf(
  element: HTMLElement,
  invoice: Invoice,
  opts: { filename?: string; download?: boolean } = {}
): Promise<Blob> {
  const filename = opts.filename || `factura-${invoice.number.replace(/\//g, "-")}.pdf`;
  return generatePdfFromElement(element, { ...opts, filename });
}
