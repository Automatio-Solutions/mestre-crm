import { Suspense } from "react";
import { LoginScreen } from "@/components/screens/auth/LoginScreen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
