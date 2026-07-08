"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionCheck } from "@/hooks/useSessionCheck";
import GuardLoader from "@/components/middleware_wrapper/GuardLoader";

export default function GuestAccess({ children }: { children: ReactNode }) {
  const { isAuthenticated, isValidating } = useSessionCheck();
  const router = useRouter();

  useEffect(() => {
    if (!isValidating && isAuthenticated) {
      router.push("/schedule");
    }
  }, [isValidating, isAuthenticated, router]);

  if (isValidating) {
    return <GuardLoader />;
  }

  if (isAuthenticated) return null;

  return <>{children}</>;
}
