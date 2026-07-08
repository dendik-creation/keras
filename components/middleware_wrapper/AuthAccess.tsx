"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSessionCheck } from "@/hooks/useSessionCheck";
import { gooeyToast } from "@/components/ui/goey-toaster";
import GuardLoader from "@/components/middleware_wrapper/GuardLoader";

export default function AuthAccess({ children }: { children: ReactNode }) {
  const { isAuthenticated, isValidating } = useSessionCheck();
  const router = useRouter();

  useEffect(() => {
    if (!isValidating && !isAuthenticated) {
      gooeyToast.error("Gak Bisa Akses", {
        description: "Silakan login terlebih dahulu",
      });
      router.push("/login");
    }
  }, [isValidating, isAuthenticated, router]);

  if (isValidating) {
    return <GuardLoader />;
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
