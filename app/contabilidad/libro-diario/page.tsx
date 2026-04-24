"use client";
import { useRouter } from "next/navigation";
import { Contabilidad } from "@/components/screens/contabilidad-impuestos-analitica";

export default function Page() {
  const router = useRouter();
  const setRoute = (r: string) => router.push(r);
  return <Contabilidad setRoute={setRoute} />;
}
