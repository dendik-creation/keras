"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ChevronLeft } from "lucide-react";
import { useSiteOffCheck } from "@/hooks/useSiteOffCheck";
import { Button } from "../ui/button";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";
import GuardLoader from "@/components/middleware_wrapper/GuardLoader";

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

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!isSiteOff) return;

      // Precise, mechanical geometry loops
      gsap.to(".swiss-shape-1", {
        rotation: 360,
        duration: 24,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
      gsap.to(".swiss-shape-2", {
        y: "-=20",
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        duration: 3,
      });
      gsap.to(".swiss-shape-3", {
        rotation: -360,
        duration: 18,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });

      const reveal = (
        selector: string,
        stagger: number = 0,
        delay: number = 0,
      ) => {
        gsap.fromTo(
          selector,
          { y: 32, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
            stagger,
            delay,
          },
        );
      };

      reveal(".gsap-headline", 0, 0.1);
      reveal(".gsap-sub", 0, 0.2);
      reveal(".gsap-countdown-block", 0.08, 0.3);
      reveal(".gsap-btn", 0, 0.6);
    },
    { scope: containerRef, dependencies: [isSiteOff] },
  );

  /* ─── LOADING STATE ─── */
  if (isLoading) {
    return <GuardLoader />;
  }

  /* ─── SITE OFF STATE ─── */
  if (isSiteOff) {
    const timeBlocks = [
      { value: timeLeft.days, label: "HARI" },
      { value: timeLeft.hours, label: "JAM" },
      { value: timeLeft.minutes, label: "MENIT" },
      { value: timeLeft.seconds, label: "DETIK" },
    ];

    return (
      <div
        ref={containerRef}
        className="min-h-screen w-full bg-white flex flex-col overflow-hidden"
      >
        {/* Top accent band */}
        <div className="w-full h-2 bg-[#FF3000]" />

        <div className="flex flex-1 flex-col md:flex-row border-t-2 border-black">
          {/* Left: Geometric Panel */}
          <div className="flex-1 flex items-center justify-center p-8 md:p-12 lg:p-24 bg-black md:border-r-2 border-black relative overflow-hidden min-h-[40vh] md:min-h-0 swiss-grid-pattern">
            {/* Red square (rotating) */}
            <div className="swiss-shape-1 absolute top-10 left-10 w-32 h-32 bg-[#FF3000]" />
            {/* White outline circle (floating) */}
            <div className="swiss-shape-2 absolute bottom-10 right-10 w-24 h-24 rounded-full border-2 border-white/50" />
            {/* Outline square (rotating) */}
            <div className="swiss-shape-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/40 rotate-45" />
            {/* Solid white dot */}
            <div className="absolute top-16 right-16 w-4 h-4 bg-white" />
          </div>

          {/* Right: Content Panel */}
          <div className="flex-1 flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-white">
            <div className="max-w-xl">
              {/* Section label */}
              <div className="gsap-headline opacity-0 flex items-center gap-4 mb-6">
                <span className="text-[#FF3000] font-black text-sm tracking-widest">
                  !
                </span>
                <div className="w-8 h-0.5 bg-[#FF3000]" />
                <span className="text-xs font-bold uppercase tracking-widest text-black">
                  Status Sistem
                </span>
              </div>

              {/* Headline */}
              <div className="mb-6 gsap-headline opacity-0">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-black uppercase leading-[0.85]">
                  KRS Belum <span className="text-[#FF3000]">Dibuka</span>
                </h1>
              </div>

              <p className="gsap-sub opacity-0 text-base text-[#555555] mb-10 leading-relaxed font-medium border-l-2 border-[#FF3000] pl-4">
                KRS resmi universitas belum dibuka, sehingga KeRaS belum dapat
                digunakan.
              </p>

              {/* Countdown Blocks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-2 border-black mb-8">
                {timeBlocks.map((block, i) => (
                  <div
                    key={block.label}
                    className={`
                      gsap-countdown-block opacity-0 bg-white flex flex-col items-center justify-center p-4 md:p-6 relative
                      ${i < timeBlocks.length - 1 ? "border-r-2 border-black" : ""}
                    `}
                  >
                    {/* Top accent — red only on the fastest unit */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        i === timeBlocks.length - 1
                          ? "bg-[#FF3000]"
                          : "bg-black"
                      }`}
                    />
                    {block.value == 0 ? (
                      <Skeleton className="w-12 h-12 bg-[#F2F2F2]" />
                    ) : (
                      <span className="text-4xl md:text-5xl font-black text-black tabular-nums leading-none">
                        {block.value.toString().padStart(2, "0")}
                      </span>
                    )}
                    <span className="text-[10px] font-black text-[#555555] tracking-[0.2em] mt-2 uppercase">
                      {block.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Back button */}
              <Link className="w-full block gsap-btn opacity-0" href={"/"}>
                <Button className="w-full bg-black text-white rounded-none uppercase font-black tracking-widest h-14 text-base hover:bg-[#FF3000] transition-colors duration-200">
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Kembali Ke Beranda
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom accent band */}
        <div className="w-full h-2 bg-[#FF3000] border-t-2 border-black" />
      </div>
    );
  }

  return <>{children}</>;
}
