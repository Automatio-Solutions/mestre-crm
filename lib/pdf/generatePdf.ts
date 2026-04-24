"use client";

/**
 * Escala de captura para todos los PDFs.
 * 1.5 (≈144 dpi) es el valor elegido tras probar: da menos ruido visual de
 * antialiasing que 2x al ver en pantalla a tamaño real. Aguanta zoom ligero.
 */
const PDF_SCALE = 1.5;

export async function generatePdfFromElement(
  element: HTMLElement,
  opts: { filename: string; download?: boolean }
): Promise<Blob> {
  const { default: html2canvas } = await import("html2canvas");
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(element, {
    scale: PDF_SCALE,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    imageTimeout: 8000,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const SINGLE_PAGE_TOLERANCE = 1.05;

  if (imgHeight <= pageHeight * SINGLE_PAGE_TOLERANCE) {
    const fittedHeight = Math.min(imgHeight, pageHeight);
    // Compresión SLOW = mejor ratio sin pérdida visual (PNG es lossless)
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, fittedHeight, undefined, "SLOW");
  } else {
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "SLOW");
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "SLOW");
      heightLeft -= pageHeight;
    }
  }

  if (opts.download !== false) {
    pdf.save(opts.filename);
  }

  return pdf.output("blob");
}
