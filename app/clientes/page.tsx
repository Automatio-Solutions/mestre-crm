import { Suspense } from "react";
import { WorkspaceScreen } from "@/components/screens/workspace/WorkspaceScreen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WorkspaceScreen />
    </Suspense>
  );
}
