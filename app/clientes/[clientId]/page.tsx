"use client";
import { useRouter } from "next/navigation";
import { ClienteOverview } from "@/components/screens/clientes";

export default function Page({ params }: { params: { clientId: string } }) {
  const router = useRouter();
  const setRoute = (r: string) => router.push(r);
  return <ClienteOverview clientId={params.clientId} setRoute={setRoute} />;
}
