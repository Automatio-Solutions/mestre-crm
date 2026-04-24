import { QuoteDetailScreen } from "@/components/screens/ventas/QuoteDetailScreen";

export default function Page({ params }: { params: { quoteId: string } }) {
  return <QuoteDetailScreen quoteId={params.quoteId} />;
}
