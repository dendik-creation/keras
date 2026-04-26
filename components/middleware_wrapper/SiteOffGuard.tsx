"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ChevronLeft } from "lucide-react";
import { useSiteOffCheck } from "@/hooks/useSiteOffCheck";
import { Button } from "../ui/button";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";

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

      // Geometric background shapes (infinite loops)
      gsap.to(".bauhaus-shape-1", {
        rotation: 360,
        duration: 20,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
      gsap.to(".bauhaus-shape-2", {
        y: "-=20",
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        duration: 3,
      });
      gsap.to(".bauhaus-shape-3", {
        rotation: -360,
        duration: 15,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });

      // Strict Slide & Fade Reveal
      const reveal = (
        selector: string,
        stagger: number = 0,
        delay: number = 0,
      ) => {
        gsap.fromTo(
          selector,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power3.out",
            stagger,
            delay,
          },
        );
      };

      reveal(".gsap-headline", 0, 0.1);
      reveal(".gsap-sub", 0, 0.2);
      reveal(".gsap-countdown-block", 0.1, 0.3);
      reveal(".gsap-btn", 0, 0.6);
    },
    { scope: containerRef, dependencies: [isSiteOff] },
  );

  /* ─── LOADING STATE ─── */
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F0F0F0] flex-col gap-4">
        <div className="relative w-16 h-16 border-4 border-[#121212]">
          <div className="absolute inset-1 bg-[#D02020] animate-spin" />
        </div>
      </div>
    );
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
        className="min-h-screen w-full bg-[#F0F0F0] flex flex-col overflow-hidden"
      >
        {/* Top color band */}
        <div className="flex w-full">
          <div className="flex-1 h-3 bg-[#D02020] border-b-4 border-[#121212]" />
          <div className="flex-1 h-3 bg-[#1040C0] border-b-4 border-[#121212]" />
          <div className="flex-1 h-3 bg-[#F0C020] border-b-4 border-[#121212]" />
        </div>

        <div className="flex flex-1 flex-col md:flex-row">
          {/* Left: Animation / Decorative Panel */}
          <div className="flex-1 flex items-center justify-center p-8 md:p-12 lg:p-24 bg-[#121212] border-r-4 border-[#121212] relative overflow-hidden min-h-[40vh] md:min-h-0">
            {/* Geometric background shapes */}
            <div className="bauhaus-shape-1 absolute top-8 left-8 w-32 h-32 bg-[#D02020] border-4 border-[#F0F0F0]/20" />
            <div className="bauhaus-shape-2 absolute bottom-8 right-8 w-24 h-24 rounded-full bg-[#1040C0] border-4 border-[#F0F0F0]/20" />
            <div className="bauhaus-shape-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#F0C020] border-4 border-[#F0F0F0]/20 rotate-45" />
          </div>

          {/* Right: Content Panel */}
          <div className="flex-1 flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-[#F0F0F0]">
            <div className="max-w-xl">
              {/* Headline */}
              <div className="mb-6 gsap-headline opacity-0">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-[#121212] uppercase leading-[0.88]">
                  KRS BELUM <span className="text-[#D02020]">DIBUKA</span>
                </h1>
              </div>

              <p className="gsap-sub opacity-0 text-base text-[#555555] mb-10 leading-relaxed font-medium border-l-4 border-[#1040C0] pl-4">
                KRS resmi universitas belum dibuka, sehingga KeRaS. belum dapat
                digunakan.
              </p>

              {/* Countdown Blocks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] mb-8">
                {timeBlocks.map((block, i) => (
                  <div
                    key={block.label}
                    className={`
                      gsap-countdown-block opacity-0 bg-white flex flex-col items-center justify-center p-4 md:p-6 relative
                      ${i < timeBlocks.length - 1 ? "border-r-4 border-[#121212]" : ""}
                    `}
                  >
                    {/* Top accent color per block */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        i === 0
                          ? "bg-[#D02020]"
                          : i === 1
                            ? "bg-[#1040C0]"
                            : i === 2
                              ? "bg-[#F0C020]"
                              : "bg-[#121212]"
                      }`}
                    />
                    {block.value == 0 ? (
                      <Skeleton
                        className={`w-12 h-12 ${
                          i === 0
                            ? "bg-[#D02020]"
                            : i === 1
                              ? "bg-[#1040C0]"
                              : i === 2
                                ? "bg-[#F0C020]"
                                : "bg-[#121212]"
                        }`}
                      />
                    ) : (
                      <span className="text-4xl md:text-5xl font-black text-[#121212] tabular-nums leading-none">
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
                <Button className="w-full bg-[#1040C0] text-white border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] rounded-none uppercase font-black tracking-widest h-14 text-base hover:-translate-y-1 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Kembali Ke Beranda
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom color band */}
        <div className="flex w-full">
          <div className="flex-1 h-3 bg-[#F0C020] border-t-4 border-[#121212]" />
          <div className="flex-1 h-3 bg-[#1040C0] border-t-4 border-[#121212]" />
          <div className="flex-1 h-3 bg-[#D02020] border-t-4 border-[#121212]" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
