import { ClientPortal } from "@/components/screens/portal/ClientPortal";

export default function Page({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { preview?: string };
}) {
  return <ClientPortal token={params.token} preview={!!searchParams?.preview} />;
}
