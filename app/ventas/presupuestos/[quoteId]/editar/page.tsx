import { NewQuoteScreen } from "@/components/screens/ventas/NewQuoteScreen";

export default function Page({ params }: { params: { quoteId: string } }) {
  return <NewQuoteScreen quoteId={params.quoteId} />;
}
