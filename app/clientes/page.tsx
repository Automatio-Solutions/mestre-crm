"use client";
import { useRouter } from "next/navigation";
import { Clientes } from "@/components/screens/clientes";

export default function Page() {
  const router = useRouter();
  const setRoute = (r: string) => router.push(r);
  return <Clientes setRoute={setRoute} />;
}
