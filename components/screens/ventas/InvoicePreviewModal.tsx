"use client";
import { useRef, useState } from "react";
import { Modal, Button, Icon } from "@/components/ui";
import { InvoiceDocument } from "./InvoiceDocument";
import type { Invoice } from "@/lib/db/invoices";
import { generateInvoicePdf } from "@/lib/pdf/generateInvoicePdf";

export function InvoicePreviewModal({
  open, onClose, invoice, client,
}: {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  client: any | null;
}) {
  const docRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!docRef.current) return;
    setDownloading(true);
    try {
      await generateInvoicePdf(docRef.current, invoice);
    } catch (e) {
      console.error(e);
      alert("Error generando el PDF. Revisa la consola.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width={900}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px", borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            Vista previa · {invoice.number}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Icon name="download" size={13} />}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? "Generando…" : "Descargar PDF"}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} title="Cerrar">
              <Icon name="close" size={14} />
            </Button>
          </div>
        </div>
        <div
          style={{
            background: "var(--beige-bg)",
            padding: 28,
            overflow: "auto",
            maxHeight: "calc(100vh - 200px)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.1)", background: "#fff" }}>
            <InvoiceDocument ref={docRef} invoice={invoice} client={client} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
