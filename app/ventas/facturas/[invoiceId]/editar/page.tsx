import { Suspense } from "react";
import { NewInvoiceScreen } from "@/components/screens/ventas/NewInvoiceScreen";

export default function Page({ params }: { params: { invoiceId: string } }) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
          Cargando…
        </div>
      }
    >
      <NewInvoiceScreen invoiceId={params.invoiceId} />
    </Suspense>
  );
}
