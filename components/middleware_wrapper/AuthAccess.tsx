"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSessionCheck } from "@/hooks/useSessionCheck";
import { gooeyToast } from "@/components/ui/goey-toaster";
import GuardLoader from "@/components/middleware_wrapper/GuardLoader";

export default function AuthAccess({ children }: { children: ReactNode }) {
  const { isAuthenticated, isValidating, sessionIssue } = useSessionCheck();
  const router = useRouter();

  useEffect(() => {
    if (isValidating || isAuthenticated) return;

    if (sessionIssue?.reason === "questionnaire_required") {
      gooeyToast.warning("Isi Kuesioner Dulu Wok", {
        description:
          "Harus ngisi dulu baru bisa akses KRS😹",
        action: {
          label: "Isi Kuesioner",
          onClick: () => window.open(sessionIssue.questionnaireUrl, "_blank"),
        },
      });
      router.push("/login");
      return;
    }

    gooeyToast.error("Gak Bisa Akses", {
      description: "Silakan login terlebih dahulu",
    });
    router.push("/login");
  }, [isValidating, isAuthenticated, sessionIssue, router]);

  if (isValidating) {
    return <GuardLoader />;
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
