"use client";

import { ReactNode, useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useSiteOffCheck } from "@/hooks/useSiteOffCheck";
import { Button } from "../ui/button";
import Link from "next/link";

export default function SiteOffGuard({ children }: { children: ReactNode }) {
  const { isLoading, isSiteOff, deadline } = useSiteOffCheck();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDateString = deadline || "2026-03-10T08:00:00";
    const targetDate = new Date(targetDateString).getTime();

    if (isNaN(targetDate)) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor(
            (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
          ),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 flex-col gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Site status checking...
        </p>
      </div>
    );
  }

  if (isSiteOff) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-slate-50 to-slate-100 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-8 md:p-12 lg:p-24 bg-white/40 backdrop-blur-sm border-r border-slate-200/50 relative">
          <iframe
            src="https://lottie.host/embed/179b787c-0a6a-4431-be7b-3c0aac0f7df6/a421RYO5z7.lottie"
            className="w-full animate h-full"
          ></iframe>
        </div>

        <div className="flex-1 flex flex-col justify-center p-8 md:p-12 lg:p-24 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              KeRaS Belum Dibuka
            </h1>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed">
              Akses ke sistem ini belum tersedia. Sistem akan dibuka dan dapat
              diakses kembali pada waktu yang telah ditentukan.
            </p>
            <div className="space-y-8 mb-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold text-black">
                    {timeLeft.days.toString().padStart(2, "0")}
                  </span>
                  <span className="text-xs font-bold text-slate-400 tracking-widest mt-2">
                    Hari
                  </span>
                </div>
                <div className="bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold text-black">
                    {timeLeft.hours.toString().padStart(2, "0")}
                  </span>
                  <span className="text-xs font-bold text-slate-400 tracking-widest mt-2">
                    Jam
                  </span>
                </div>
                <div className="bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold text-black">
                    {timeLeft.minutes.toString().padStart(2, "0")}
                  </span>
                  <span className="text-xs font-bold text-slate-400 tracking-widest mt-2">
                    Menit
                  </span>
                </div>
                <div className="bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold text-black">
                    {timeLeft.seconds.toString().padStart(2, "0")}
                  </span>
                  <span className="text-xs font-bold text-slate-400 tracking-widest mt-2">
                    Detik
                  </span>
                </div>
              </div>
            </div>
            <Link className="w-full" href={"/"}>
              <Button className="w-full" variant={"blue"} size={"lg"}>
                <ChevronLeft />
                <span>Kembali Ke Beranda</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
