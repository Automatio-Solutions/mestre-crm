"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClienteModulo } from "@/components/screens/cliente-modulo";

function Inner({ clientId, moduleId }: { clientId: string; moduleId: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const setRoute = (r: string) => router.push(r);
  return (
    <ClienteModulo
      clientId={clientId}
      moduleId={moduleId}
      setRoute={setRoute}
      initialTaskId={sp.get("task") || undefined}
    />
  );
}

export default function Page({ params }: { params: { clientId: string; moduleId: string } }) {
  return (
    <Suspense fallback={null}>
      <Inner clientId={params.clientId} moduleId={params.moduleId} />
    </Suspense>
  );
}
