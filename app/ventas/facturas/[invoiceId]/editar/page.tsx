import { NewInvoiceScreen } from "@/components/screens/ventas/NewInvoiceScreen";

export default function Page({ params }: { params: { invoiceId: string } }) {
  return <NewInvoiceScreen invoiceId={params.invoiceId} />;
}
