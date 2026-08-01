"use client";

/**
 * CenterFlow — Architecture & Editorial Storytelling Section
 * Swiss / International Typographic Style
 *
 * 45% Left Column: Editorial Story (Why KeRaS, Headline, Subtext, Highlights)
 * 55% Right Column: Center Flow (Student → KeRaS → Outputs SVG Flow)
 * Mobile: Editorial top, Flow bottom
 * Motion: Fast GSAP ScrollTrigger timeline reveal + Red looping trail animation on connector lines
 */

import { useRef, useState, useLayoutEffect, useCallback } from "react";
import Image from "next/image";
import { CalendarCheck, CheckCircle2, University, Swords } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─── Geometry constants ───────────────────────────────────────────────────────
const MAIN_SIZE = 120; // main KeRaS node px
const NODE_SIZE = 64;  // secondary node px

interface NodeProps {
  size?: "main" | "secondary";
  label: string;
  children: React.ReactNode;
  className?: string;
}

function FlowNode({ size = "secondary", label, children, className = "" }: NodeProps) {
  const isMain = size === "main";
  const side = isMain ? MAIN_SIZE : NODE_SIZE;

  return (
    <div className={`flex flex-col items-center gap-2.5 ${className}`}>
      <div
        className={`node-box bg-white border-2 border-black flex items-center justify-center transition-shadow duration-300 ${
          isMain ? "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        }`}
        style={{ width: side, height: side, borderRadius: 0 }}
      >
        {children}
      </div>
      <span
        className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-black text-center leading-tight max-w-[100px]"
        aria-label={label}
      >
        {label}
      </span>
    </div>
  );
}

const SectionLabel = ({ index, label, inverted }: { index: string; label: string; inverted?: boolean }) => {
  return (
    <div className="flex items-center gap-4 mb-12">
      <span className="text-[#FF3000] font-black text-sm tracking-widest tabular-nums">
        {index}
      </span>
      <div className="w-8 h-0.5 bg-[#FF3000]" />
      <span className={`text-xs font-bold uppercase tracking-widest ${inverted ? 'text-white' : 'text-black'}`}>
        {label}
      </span>
    </div>
  );
};

export default function CenterFlow() {
  const sectionRef = useRef<HTMLElement>(null);

  // Left Editorial Refs
  const labelRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);

  // Flow Wrapper Refs
  const desktopWrapRef = useRef<HTMLDivElement>(null);
  const mobileWrapRef = useRef<HTMLDivElement>(null);

  // Desktop Flow Node Refs
  const dStudentRef = useRef<HTMLDivElement>(null);
  const dKerasRef = useRef<HTMLDivElement>(null);
  const dSchedRef = useRef<HTMLDivElement>(null);
  const dSubmitRef = useRef<HTMLDivElement>(null);

  // Mobile Flow Node Refs
  const mStudentRef = useRef<HTMLDivElement>(null);
  const mKerasRef = useRef<HTMLDivElement>(null);
  const mSchedRef = useRef<HTMLDivElement>(null);
  const mSubmitRef = useRef<HTMLDivElement>(null);

  // Desktop SVG Path Refs (Black Base)
  const dPathLeftRef = useRef<SVGPathElement>(null);
  const dPathRightARef = useRef<SVGPathElement>(null);
  const dPathRightBRef = useRef<SVGPathElement>(null);

  // Desktop SVG Path Refs (Red Trail)
  const dPathLeftRedRef = useRef<SVGPathElement>(null);
  const dPathRightARedRef = useRef<SVGPathElement>(null);
  const dPathRightBRedRef = useRef<SVGPathElement>(null);

  // Mobile SVG Path Refs (Black Base)
  const mPathLeftRef = useRef<SVGPathElement>(null);
  const mPathRightARef = useRef<SVGPathElement>(null);
  const mPathRightBRef = useRef<SVGPathElement>(null);

  // Mobile SVG Path Refs (Red Trail)
  const mPathLeftRedRef = useRef<SVGPathElement>(null);
  const mPathRightARedRef = useRef<SVGPathElement>(null);
  const mPathRightBRedRef = useRef<SVGPathElement>(null);

  // SVG Paths state
  const [dPaths, setDPaths] = useState({ left: "", rightA: "", rightB: "" });
  const [mPaths, setMPaths] = useState({ left: "", rightA: "", rightB: "" });

  // ─── Calculate SVG Paths ────────────────────────────────────────────────────
  const computePaths = useCallback(() => {
    // Desktop Computation
    if (
      desktopWrapRef.current &&
      dStudentRef.current &&
      dKerasRef.current &&
      dSchedRef.current &&
      dSubmitRef.current
    ) {
      const wrapRect = desktopWrapRef.current.getBoundingClientRect();
      const ox = wrapRect.left;
      const oy = wrapRect.top;

      const getBoxRect = (el: HTMLElement) => {
        const box = el.querySelector(".node-box") as HTMLElement;
        return (box || el).getBoundingClientRect();
      };

      const stBox = getBoxRect(dStudentRef.current);
      const krBox = getBoxRect(dKerasRef.current);
      const scBox = getBoxRect(dSchedRef.current);
      const sbBox = getBoxRect(dSubmitRef.current);

      const stExit = { x: stBox.right - ox, y: stBox.top - oy + stBox.height / 2 };
      const krEntry = { x: krBox.left - ox, y: krBox.top - oy + krBox.height / 2 };
      const krExitA = { x: krBox.right - ox, y: krBox.top - oy + krBox.height * 0.3 };
      const krExitB = { x: krBox.right - ox, y: krBox.top - oy + krBox.height * 0.7 };
      const scEntry = { x: scBox.left - ox, y: scBox.top - oy + scBox.height / 2 };
      const sbEntry = { x: sbBox.left - ox, y: sbBox.top - oy + sbBox.height / 2 };

      const cp1X = (stExit.x + krEntry.x) / 2;
      const cp2AX = (krExitA.x + scEntry.x) / 2;
      const cp2BX = (krExitB.x + sbEntry.x) / 2;

      setDPaths({
        left: `M ${stExit.x} ${stExit.y} C ${cp1X} ${stExit.y}, ${cp1X} ${krEntry.y}, ${krEntry.x} ${krEntry.y}`,
        rightA: `M ${krExitA.x} ${krExitA.y} C ${cp2AX} ${krExitA.y}, ${cp2AX} ${scEntry.y}, ${scEntry.x} ${scEntry.y}`,
        rightB: `M ${krExitB.x} ${krExitB.y} C ${cp2BX} ${krExitB.y}, ${cp2BX} ${sbEntry.y}, ${sbEntry.x} ${sbEntry.y}`,
      });
    }

    // Mobile Computation
    if (
      mobileWrapRef.current &&
      mStudentRef.current &&
      mKerasRef.current &&
      mSchedRef.current &&
      mSubmitRef.current
    ) {
      const wrapRect = mobileWrapRef.current.getBoundingClientRect();
      const ox = wrapRect.left;
      const oy = wrapRect.top;

      const getBoxRect = (el: HTMLElement) => {
        const box = el.querySelector(".node-box") as HTMLElement;
        return (box || el).getBoundingClientRect();
      };

      const stBox = getBoxRect(mStudentRef.current);
      const krBox = getBoxRect(mKerasRef.current);
      const scBox = getBoxRect(mSchedRef.current);
      const sbBox = getBoxRect(mSubmitRef.current);

      const stExit = { x: stBox.left - ox + stBox.width / 2, y: stBox.bottom - oy };
      const krEntry = { x: krBox.left - ox + krBox.width / 2, y: krBox.top - oy };
      const krExitA = { x: krBox.left - ox + krBox.width * 0.35, y: krBox.bottom - oy };
      const krExitB = { x: krBox.left - ox + krBox.width * 0.65, y: krBox.bottom - oy };
      const scEntry = { x: scBox.left - ox + scBox.width / 2, y: scBox.top - oy };
      const sbEntry = { x: sbBox.left - ox + sbBox.width / 2, y: sbBox.top - oy };

      const cp1Y = (stExit.y + krEntry.y) / 2;
      const cp2AY = (krExitA.y + scEntry.y) / 2;
      const cp2BY = (krExitB.y + sbEntry.y) / 2;

      setMPaths({
        left: `M ${stExit.x} ${stExit.y} C ${stExit.x} ${cp1Y}, ${krEntry.x} ${cp1Y}, ${krEntry.x} ${krEntry.y}`,
        rightA: `M ${krExitA.x} ${krExitA.y} C ${krExitA.x} ${cp2AY}, ${scEntry.x} ${cp2AY}, ${scEntry.x} ${scEntry.y}`,
        rightB: `M ${krExitB.x} ${krExitB.y} C ${krExitB.x} ${cp2BY}, ${sbEntry.x} ${cp2BY}, ${sbEntry.x} ${sbEntry.y}`,
      });
    }
  }, []);

  useLayoutEffect(() => {
    computePaths();
    window.addEventListener("resize", computePaths);
    return () => window.removeEventListener("resize", computePaths);
  }, [computePaths]);

  // ─── GSAP ScrollTrigger Sequence & Red Trail Loop Animation ────────────────
  useLayoutEffect(() => {
    if (!sectionRef.current) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const editorialNodes = [
      labelRef.current,
      headlineRef.current,
      paragraphRef.current,
      highlightsRef.current,
    ].filter(Boolean);

    const isDesktop = window.innerWidth >= 1024;
    const studentRef = isDesktop ? dStudentRef.current : mStudentRef.current;
    const kerasRef = isDesktop ? dKerasRef.current : mKerasRef.current;
    const schedRef = isDesktop ? dSchedRef.current : mSchedRef.current;
    const submitRef = isDesktop ? dSubmitRef.current : mSubmitRef.current;

    const pLeft = isDesktop ? dPathLeftRef.current : mPathLeftRef.current;
    const pRightA = isDesktop ? dPathRightARef.current : mPathRightARef.current;
    const pRightB = isDesktop ? dPathRightBRef.current : mPathRightBRef.current;

    const pLeftRed = isDesktop ? dPathLeftRedRef.current : mPathLeftRedRef.current;
    const pRightARed = isDesktop ? dPathRightARedRef.current : mPathRightARedRef.current;
    const pRightBRed = isDesktop ? dPathRightBRedRef.current : mPathRightBRedRef.current;

    const allNodes = [studentRef, kerasRef, schedRef, submitRef].filter(Boolean);
    const allBasePaths = [pLeft, pRightA, pRightB].filter(Boolean);
    const allRedPaths = [pLeftRed, pRightARed, pRightBRed].filter(Boolean);

    if (reduced) {
      gsap.set(editorialNodes, { opacity: 1, y: 0 });
      gsap.set(allNodes, { opacity: 1, y: 0 });
      allBasePaths.forEach((path) => {
        if (path) gsap.set(path, { strokeDashoffset: 0 });
      });
      allRedPaths.forEach((path) => {
        if (path) gsap.set(path, { opacity: 1 });
      });
      return;
    }

    // Set initial hidden states (fast reveal prep)
    gsap.set(editorialNodes, { opacity: 0, y: 12 });
    gsap.set(allNodes, { opacity: 0, y: 12 });

    // Prepare SVG path dash lengths
    allBasePaths.forEach((path) => {
      if (path) {
        const len = path.getTotalLength?.() || 300;
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
      }
    });

    // Hide red trail paths initially
    allRedPaths.forEach((path) => {
      if (path) {
        gsap.set(path, { opacity: 0 });
      }
    });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: "top 85%", // Triggers sooner when entering viewport
          toggleActions: "play none none none",
        },
      });

      // 1. Fast Editorial text fade in (0.25s duration)
      tl.to(editorialNodes, {
        y: 0,
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
        stagger: 0.05,
      });

      // 2. Fast Student node fade in
      if (studentRef) {
        tl.to(
          studentRef,
          {
            y: 0,
            opacity: 1,
            duration: 0.25,
            ease: "power2.out",
          },
          "-=0.1"
        );
      }

      // 3. Fast KeRaS main node fade in
      if (kerasRef) {
        tl.to(
          kerasRef,
          {
            y: 0,
            opacity: 1,
            duration: 0.25,
            ease: "power2.out",
          },
          "+=0.02"
        );
      }

      // 4. Fast Left connector draw (Student -> KeRaS)
      if (pLeft) {
        tl.to(
          pLeft,
          {
            strokeDashoffset: 0,
            duration: 0.4,
            ease: "power2.inOut",
          },
          "+=0.02"
        );
      }

      // 5. Fast Right connectors draw (KeRaS -> Outputs)
      const rightPaths = [pRightA, pRightB].filter(Boolean);
      if (rightPaths.length > 0) {
        tl.to(
          rightPaths,
          {
            strokeDashoffset: 0,
            duration: 0.4,
            ease: "power2.inOut",
            stagger: 0.05,
          },
          "-=0.1"
        );
      }

      // 6. Fast Output nodes fade in (Optimized Schedule & Fast Submit)
      const outputNodes = [schedRef, submitRef].filter(Boolean);
      if (outputNodes.length > 0) {
        tl.to(
          outputNodes,
          {
            y: 0,
            opacity: 1,
            duration: 0.25,
            ease: "power2.out",
            stagger: 0.06,
          },
          "-=0.2"
        );
      }

      // 7. Reveal Red Looping Trail & start infinite flow animation
      tl.add(() => {
        if (allRedPaths.length > 0) {
          gsap.to(allRedPaths, {
            opacity: 1,
            duration: 0.2,
          });

          // Continuous infinite dash offset loop for red signal flow
          gsap.to(allRedPaths, {
            strokeDashoffset: -48,
            duration: 1.2,
            ease: "none",
            repeat: -1,
          });
        }
      }, "-=0.1");

    }, sectionRef);

    return () => ctx.revert();
  }, [dPaths, mPaths]);

  return (
    <section
      ref={sectionRef}
      id="center-flow"
      className="relative z-10 px-6 py-20 lg:py-32 max-w-7xl mx-auto overflow-hidden bg-white"
    >
      {/* Main 2-column balanced layout on desktop (45% left / 55% right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

        {/* ─── LEFT COLUMN — EDITORIAL STORY (45% / 5 cols) ─── */}
        <div className="lg:col-span-5 flex flex-col items-start">
          <SectionLabel index="02" label="Mengapa KeRaS Hadir" />

          {/* Large Headline */}
          <h2
            ref={headlineRef}
            className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.92] text-black mb-6"
          >
            Cerita Dibalik<br />
            <span className="text-[#FF3000]">Kegagalan</span> Mendapatkan Kelas
          </h2>

          {/* Supporting Paragraph */}
          <p
            ref={paragraphRef}
            className="text-base lg:text-lg text-[#444444] font-medium leading-relaxed mb-8 max-w-xl"
          >
            KeRaS mengakhiri kegagalan tersebut. Sebagai jembatan, KeRaS membantu membuatkan jadwal dan mendapatkan kelas sesuai keinginanmu.
          </p>

          {/* Key Feature Highlights */}
          <div ref={highlightsRef} className="flex flex-col gap-3 mb-10 w-full">
            {[
              "100+ Jadwal kelas berhasil dibaca",
              "AI untuk preferensi jadwalmu",
              "Satu klik submit untuk semua kelas",
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 border-l-2 border-black pl-3 py-1">
                <CheckCircle2 className="w-4 h-4 text-[#FF3000] shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-black">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── RIGHT COLUMN — CENTER FLOW VISUALIZATION (55% / 7 cols) ─── */}
        <div className="lg:col-span-7 w-full flex flex-col items-center">

          {/* Desktop Flow Diagram (lg and above) */}
          <div
            ref={desktopWrapRef}
            className="relative hidden lg:flex items-center justify-between w-full px-4 py-8 min-h-[320px]"
          >
            {/* SVG Connector Lines Overlay */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full h-full overflow-visible z-0"
            >
              {/* Black Base Paths */}
              <path
                ref={dPathLeftRef}
                d={dPaths.left}
                fill="none"
                stroke="#e5e5e5"
                strokeWidth={2}
                strokeLinecap="round"
                className="cf-connector-desktop"
              />
              <path
                ref={dPathRightARef}
                d={dPaths.rightA}
                fill="none"
                stroke="#e5e5e5"
                strokeWidth={2}
                strokeLinecap="round"
                className="cf-connector-desktop"
              />
              <path
                ref={dPathRightBRef}
                d={dPaths.rightB}
                fill="none"
                stroke="#e5e5e5"
                strokeWidth={2}
                strokeLinecap="round"
                className="cf-connector-desktop"
              />

              {/* Red Looping Trail Paths */}
              <path
                ref={dPathLeftRedRef}
                d={dPaths.left}
                fill="none"
                stroke="#FF3000"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="12 36"
                className="cf-trail-desktop"
              />
              <path
                ref={dPathRightARedRef}
                d={dPaths.rightA}
                fill="none"
                stroke="#FF3000"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="12 36"
                className="cf-trail-desktop"
              />
              <path
                ref={dPathRightBRedRef}
                d={dPaths.rightB}
                fill="none"
                stroke="#FF3000"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="12 36"
                className="cf-trail-desktop"
              />
            </svg>

            {/* Student Node */}
            <div ref={dStudentRef} className="relative z-10">
              <FlowNode label="KRS Kampus" size="secondary">
                <University className="text-black" style={{ width: NODE_SIZE * 0.45, height: NODE_SIZE * 0.45 }} strokeWidth={1.5} />
              </FlowNode>
            </div>

            {/* Main KeRaS Engine Node */}
            <div ref={dKerasRef} className="relative z-10">
              <FlowNode label="" size="main">
                <Image
                  src="/logo.png"
                  alt="KeRaS AI Engine"
                  width={Math.round(MAIN_SIZE * 0.55)}
                  height={Math.round(MAIN_SIZE * 0.55)}
                  className="object-contain"
                  priority
                />
              </FlowNode>
            </div>

            {/* Output Nodes Column */}
            <div className="relative z-10 flex flex-col gap-10">
              <div ref={dSchedRef}>
                <FlowNode label="Pengelolaan Jadwal" size="secondary">
                  <CalendarCheck className="text-black" style={{ width: NODE_SIZE * 0.45, height: NODE_SIZE * 0.45 }} strokeWidth={1.5} />
                </FlowNode>
              </div>
              <div ref={dSubmitRef}>
                <FlowNode label="Perang KRS" size="secondary">
                  <Swords className="text-black" style={{ width: NODE_SIZE * 0.45, height: NODE_SIZE * 0.45 }} strokeWidth={1.5} />
                </FlowNode>
              </div>
            </div>
          </div>

          {/* Mobile Flow Diagram (< lg) */}
          <div
            ref={mobileWrapRef}
            className="relative flex lg:hidden flex-col items-center gap-12 w-full py-8 min-h-[420px]"
          >
            {/* SVG Overlay for Mobile */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full h-full overflow-visible z-0"
            >
              {/* Black Base Paths */}
              <path
                ref={mPathLeftRef}
                d={mPaths.left}
                fill="none"
                stroke="#e5e5e5"
                strokeWidth={2}
                strokeLinecap="round"
                className="cf-connector-mobile"
              />
              <path
                ref={mPathRightARef}
                d={mPaths.rightA}
                fill="none"
                stroke="#e5e5e5"
                strokeWidth={2}
                strokeLinecap="round"
                className="cf-connector-mobile"
              />
              <path
                ref={mPathRightBRef}
                d={mPaths.rightB}
                fill="none"
                stroke="#e5e5e5"
                strokeWidth={2}
                strokeLinecap="round"
                className="cf-connector-mobile"
              />

              {/* Red Looping Trail Paths */}
              <path
                ref={mPathLeftRedRef}
                d={mPaths.left}
                fill="none"
                stroke="#FF3000"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="12 36"
                className="cf-trail-mobile"
              />
              <path
                ref={mPathRightARedRef}
                d={mPaths.rightA}
                fill="none"
                stroke="#FF3000"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="12 36"
                className="cf-trail-mobile"
              />
              <path
                ref={mPathRightBRedRef}
                d={mPaths.rightB}
                fill="none"
                stroke="#FF3000"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="12 36"
                className="cf-trail-mobile"
              />
            </svg>

            {/* Mobile Student Node */}
            <div ref={mStudentRef} className="relative z-10">
              <FlowNode label="KRS Kampus" size="secondary">
                <University className="text-black" style={{ width: NODE_SIZE * 0.45, height: NODE_SIZE * 0.45 }} strokeWidth={1.5} />
              </FlowNode>
            </div>

            {/* Mobile KeRaS Node */}
            <div ref={mKerasRef} className="relative z-10">
              <FlowNode label="" size="main">
                <Image
                  src="/logo.png"
                  alt="KeRaS AI Engine"
                  width={Math.round(MAIN_SIZE * 0.55)}
                  height={Math.round(MAIN_SIZE * 0.55)}
                  className="object-contain"
                />
              </FlowNode>
            </div>

            {/* Mobile Output Nodes */}
            <div className="relative z-10 flex gap-8 sm:gap-16 justify-center w-full">
              <div ref={mSchedRef}>
                <FlowNode label="Pengelolaan Jadwal" size="secondary">
                  <CalendarCheck className="text-black" style={{ width: NODE_SIZE * 0.45, height: NODE_SIZE * 0.45 }} strokeWidth={1.5} />
                </FlowNode>
              </div>
              <div ref={mSubmitRef}>
                <FlowNode label="Perang KRS" size="secondary">
                  <Swords className="text-black" style={{ width: NODE_SIZE * 0.45, height: NODE_SIZE * 0.45 }} strokeWidth={1.5} />
                </FlowNode>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
