"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSessionCheck } from "@/hooks/useSessionCheck";
import { toast } from "sonner";

export default function AuthAccess({ children }: { children: ReactNode }) {
  const { isAuthenticated, isValidating } = useSessionCheck();
  const router = useRouter();

  useEffect(() => {
    if (!isValidating && !isAuthenticated) {
      toast.error("Silakan login terlebih dahulu");
      router.push("/login");
    }
  }, [isValidating, isAuthenticated, router]);

  if (isValidating) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 flex-col gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Mengecek apakah kamu nyata...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
