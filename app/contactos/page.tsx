"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Contactos } from "@/components/screens/contactos";

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();
  const setRoute = (r: string) => router.push(r);
  return <Contactos setRoute={setRoute} initialOpen={sp.get("open") || undefined} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
