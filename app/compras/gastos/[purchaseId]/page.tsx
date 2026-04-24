import { PurchaseDetailScreen } from "@/components/screens/compras/PurchaseDetailScreen";

export default function Page({ params }: { params: { purchaseId: string } }) {
  return <PurchaseDetailScreen purchaseId={params.purchaseId} />;
}
