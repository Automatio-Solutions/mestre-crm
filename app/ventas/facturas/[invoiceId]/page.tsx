import { InvoiceDetailScreen } from "@/components/screens/ventas/InvoiceDetailScreen";

export default function Page({ params }: { params: { invoiceId: string } }) {
  return <InvoiceDetailScreen invoiceId={params.invoiceId} />;
}
