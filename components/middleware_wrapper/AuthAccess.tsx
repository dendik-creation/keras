"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSessionCheck } from "@/hooks/useSessionCheck";
import { gooeyToast } from "@/components/ui/goey-toaster";

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
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F0F0F0] flex-col gap-4">
        <div className="relative w-16 h-16 border-4 border-[#121212]">
          <div className="absolute inset-1 bg-[#D02020] animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
