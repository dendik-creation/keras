"use client";

import { AppLoader } from "@/components/ui/app-loader";

/** Swiss-style full-screen loading state shared by the access guards. */
export default function GuardLoader() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white swiss-grid-pattern">
      <AppLoader variant="guard" aria-label="Memeriksa akses" />
      <span className="text-md font-bold tracking-widest text-[#555555]">
        BentaR
      </span>
    </div>
  );
}
