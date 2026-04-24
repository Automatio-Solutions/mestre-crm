"use client";
import { useRouter } from "next/navigation";
import { Escaner } from "@/components/screens/compras-escaner";

export default function Page() {
  const router = useRouter();
  const setRoute = (r: string) => router.push(r);
  return <Escaner setRoute={setRoute} />;
}
