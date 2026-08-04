import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { OfferingCourse } from "@/types/course_schedule";
import { getLocalStorage, removeLocalStorage } from "@/helper/local_storage";

type UseResumeAdoptToastArgs = {
  /** Raw `?resumeAdopt=` value, still URI-encoded. Null on normal /schedule visits. */
  resumeAdopt: string | null;
  isHydrated: boolean;
  offeringCourse: OfferingCourse[] | null;
};

/**
 * /schedule-only. Purely reactive to (resumeAdopt, isHydrated, offeringCourse)
 * so it also does the right thing on a browser-back visit where the offering
 * was already cached from an earlier refresh — no imperative "refresh
 * succeeded" call needed from the page.
 */
export function useResumeAdoptToast({
  resumeAdopt,
  isHydrated,
  offeringCourse,
}: UseResumeAdoptToastArgs): void {
  const router = useRouter();
  const pendingToastId = useRef<string | number | null>(null);
  const readyToastShown = useRef(false);

  useEffect(() => {
    if (!isHydrated) return;

    const pendingStorage = getLocalStorage("krs_pending_schedule_adoption");
    let targetResume = resumeAdopt;

    if (!targetResume && pendingStorage?.resumePath) {
      targetResume = pendingStorage.resumePath;
    }

    if (!targetResume) return;

    let cleanPath = targetResume;
    if (cleanPath.includes("resumeAdopt=")) {
      const match = cleanPath.match(/resumeAdopt=([^&]+)/);
      if (match && match[1]) {
        cleanPath = decodeURIComponent(match[1]);
      }
    }

    const hasOffering = !!offeringCourse && offeringCourse.length > 0;

    if (!hasOffering) {
      if (pendingToastId.current !== null) return;
      pendingToastId.current = gooeyToast.warning(
        "Siapkan Ketersediaan Jadwalmu",
        {
          description:
            'Klik "Perbarui Ketersediaan Jadwal" dulu. Setelah selesai, kamu bisa melanjutkan adopsi jadwal',
          duration: Infinity,
        },
      );
      return;
    }

    if (pendingToastId.current !== null) {
      gooeyToast.dismiss(pendingToastId.current);
      pendingToastId.current = null;
    }

    if (readyToastShown.current) return;
    readyToastShown.current = true;
    setTimeout(() => {
      gooeyToast.success("Siap Adopsi Jadwal", {
        description: "Lanjutkan proses adopsi jadwal yang dibagikan ke kamu.",
        action: {
          label: "Lanjutkan Adopsi",
          onClick: () => {
            removeLocalStorage("krs_pending_schedule_adoption");
            router.push(cleanPath);
          },
        },
      });
    }, 400);
  }, [resumeAdopt, isHydrated, offeringCourse, router]);
}

