"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSessionCheck } from "@/hooks/useSessionCheck";

export default function GuestAccess({ children }: { children: ReactNode }) {
  const { isAuthenticated, isValidating } = useSessionCheck();
  const router = useRouter();

  useEffect(() => {
    if (!isValidating && isAuthenticated) {
      router.push("/schedule");
    }
  }, [isValidating, isAuthenticated, router]);

  if (isValidating) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return <>{children}</>;
}
