import { NewPurchaseScreen } from "@/components/screens/compras/NewPurchaseScreen";

export default function Page({ params }: { params: { purchaseId: string } }) {
  return <NewPurchaseScreen purchaseId={params.purchaseId} />;
}
