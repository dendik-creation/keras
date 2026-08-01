"use client";

import { useState, useRef, useId } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

gsap.registerPlugin(ScrollTrigger);

export interface FeatureItem {
  id: string;
  number: string;
  title: string;
  description: string;
  visualizationLabel?: string;
  visualizationComponent?: React.ReactNode;
}

const DEFAULT_FEATURES: FeatureItem[] = [
  {
    id: "unified-view",
    number: "01",
    title: "Unified Schedule View",
    description:
      "Lihat seluruh kombinasi mata kuliah yang tersedia dalam satu tampilan terpadu tanpa perlu membuka puluhan tab browser secara manual.",
    visualizationLabel: "Unified View Visualization",
  },
  {
    id: "conflict-detection",
    number: "02",
    title: "Conflict Detection",
    description:
      "Algoritma otomatis mendeteksi bentrok jadwal dan prasyarat sebelum KRS dimulai, mencegah kegagalan registrasi di menit-menit krusial.",
    visualizationLabel: "Conflict Engine Visualization",
  },
  {
    id: "fast-submit",
    number: "03",
    title: "Fast Submit Workflow",
    description:
      "Eksekusi pengisian KRS dalam satu urutan terkoordinasi langsung ke portal universitas tanpa klik repetitif saat trafik puncak.",
    visualizationLabel: "Fast Submit Flow Visualization",
  },
  {
    id: "zero-database",
    number: "04",
    title: "Zero Database Architecture",
    description:
      "Data kredensial dan preferensi jadwal diproses secara lokal dan ephemerally. Kredensial tidak pernah disimpan dalam database server.",
    visualizationLabel: "Zero-DB Security Visualization",
  },
  {
    id: "realtime-scraping",
    number: "05",
    title: "Realtime Data Sync",
    description:
      "Sinkronisasi kuota dan status kelas secara langsung dari sistem universitas untuk informasi kapasitas yang paling mutakhir.",
    visualizationLabel: "Realtime Data Sync Visualization",
  },
];

function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-[#FF3000] font-black text-sm tracking-widest tabular-nums">
        {index}
      </span>
      <div className="w-8 h-0.5 bg-[#FF3000]" />
      <span className="text-xs font-bold uppercase tracking-widest text-black">
        {label}
      </span>
    </div>
  );
}

function FeatureVisualizationPlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-black/40 select-none p-6">
      <div className="relative w-24 h-24 border-2 border-dashed border-black/20 flex items-center justify-center">
        <svg
          className="w-12 h-12 stroke-black/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
          />
        </svg>
      </div>
      <span className="font-mono text-xs uppercase tracking-widest text-black/50 text-center font-bold">
        {label}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-wider text-black/30 border border-black/10 px-2 py-0.5">
        SVG Placeholder
      </span>
    </div>
  );
}

export default function FeatureShowcase({
  features = DEFAULT_FEATURES,
}: {
  features?: FeatureItem[];
}) {
  const [activeId, setActiveId] = useState<string>(features[0]?.id || "");
  const containerRef = useRef<HTMLDivElement>(null);
  const vizFrameRef = useRef<HTMLDivElement>(null);
  const tabListId = useId();

  const activeFeature =
    features.find((f) => f.id === activeId) || features[0];

  // GSAP reveal sequence for section load
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduced) {
        gsap.set("[data-[#showcase-reveal]]", {
          opacity: 1,
          y: 0,
        });
        return;
      }

      const elements = [
        ".feat-sec-label",
        ".feat-sec-headline",
        ".feat-sec-para",
        ".feat-sec-cta",
        ".feat-sec-nav-item",
        ".feat-sec-viz-frame",
      ];

      gsap.fromTo(
        elements,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          },
        },
      );
    },
    { scope: containerRef },
  );

  const handleFeatureSelect = (id: string) => {
    if (id === activeId) return;

    // Feature change animation: fade out visualization, swap state, fade back in (250ms)
    if (vizFrameRef.current) {
      gsap.to(vizFrameRef.current, {
        opacity: 0,
        duration: 0.15,
        ease: "power2.in",
        onComplete: () => {
          setActiveId(id);
          gsap.to(vizFrameRef.current, {
            opacity: 1,
            duration: 0.15,
            ease: "power2.out",
          });
        },
      });
    } else {
      setActiveId(id);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (index + 1) % features.length;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (index - 1 + features.length) % features.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = features.length - 1;
    }

    if (nextIndex !== index) {
      const nextFeature = features[nextIndex];
      if (nextFeature) {
        handleFeatureSelect(nextFeature.id);
        const targetBtn = document.getElementById(
          `${tabListId}-tab-${nextFeature.id}`,
        );
        targetBtn?.focus();
      }
    }
  };

  return (
    <section
      id="features"
      ref={containerRef}
      className="relative z-10 px-6 py-20 md:py-28 max-w-7xl mx-auto bg-white text-black"
    >
      {/* 42% / 58% desktop ratio grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-stretch">
        {/* Left Column: Storytelling Column (42% -> 5 cols lg) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            {/* Section Label */}
            <div className="feat-sec-label opacity-0 mb-8">
              <SectionLabel index="02" label="FITUR" />
            </div>

            {/* Editorial Headline */}
            <h2 className="feat-sec-headline opacity-0 text-4xl sm:text-5xl lg:text-5xl font-black uppercase tracking-tighter leading-[0.92] text-black mb-6">
              Satu platform.
              <br />
              <span className="text-[#FF3000]">Setiap langkah</span> KRS kamu.
            </h2>

            {/* Supporting Paragraph */}
            <p className="feat-sec-para opacity-0 text-base md:text-lg text-[#444444] leading-relaxed font-medium max-w-md mb-8">
              KeRaS dirancang bukan sekadar kumpulan alat terpisah, melainkan
              alur kerja cerdas untuk memastikan proses KRS cepat, aman, dan
              bebas bentrok.
            </p>

            {/* Primary CTA */}
            <div className="feat-sec-cta opacity-0 mb-12">
              <a href="#hero">
                <Button className="rounded-none bg-black text-white hover:bg-[#FF3000] hover:text-white uppercase font-black tracking-widest h-12 px-8 text-sm transition-colors duration-200 border-2 border-black group">
                  Mulai Sekarang{" "}
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </a>
            </div>
          </div>

          {/* Vertical Feature Navigation */}
          <div
            role="tablist"
            aria-label="Fitur KeRaS"
            className="w-full border-t-2 border-black"
          >
            {features.map((feature, idx) => {
              const isActive = feature.id === activeId;
              const tabId = `${tabListId}-tab-${feature.id}`;
              const panelId = `${tabListId}-panel-${feature.id}`;

              return (
                <button
                  key={feature.id}
                  id={tabId}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleFeatureSelect(feature.id)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className={`feat-sec-nav-item opacity-0 w-full text-left py-4 px-2 border-b border-black/15 flex items-center justify-between transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3000] ${
                    isActive
                      ? "border-l-4 border-l-[#FF3000] pl-3 text-black font-black"
                      : "text-black/50 hover:text-black font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-mono tracking-wider tabular-nums ${
                        isActive ? "text-[#FF3000] font-black" : "text-black/40"
                      }`}
                    >
                      {feature.number}
                    </span>
                    <span className="text-base md:text-lg tracking-tight uppercase">
                      {feature.title}
                    </span>
                  </div>
                  <span
                    className={`transition-transform duration-200 ${
                      isActive
                        ? "text-[#FF3000] translate-x-1"
                        : "text-black/40 group-hover:text-black group-hover:translate-x-0.5"
                    }`}
                    aria-hidden="true"
                  >
                    {isActive ? (
                      <ArrowRight className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Visualization Frame (58% -> 7 cols lg) */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {/* GitHub-inspired Visualization Frame */}
          <div className="feat-sec-viz-frame opacity-0 w-full bg-white border-2 border-black p-6 md:p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative min-h-[400px] lg:min-h-[520px] flex items-center justify-center overflow-hidden">
            {/* Dynamic Active Description + Placeholder Container */}
            <div
              id={`${tabListId}-panel-${activeFeature.id}`}
              role="tabpanel"
              aria-labelledby={`${tabListId}-tab-${activeFeature.id}`}
              ref={vizFrameRef}
              className="w-full h-full flex flex-col justify-between items-center"
            >
              {/* Feature info overlay bar inside frame */}
              <div className="w-full flex items-center justify-between border-b border-black/10 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#FF3000] block" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-black">
                    {activeFeature.number} / {activeFeature.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-black/40 bg-black/5 px-2 py-0.5 border border-black/10">
                  Interactive Showcase
                </span>
              </div>

              {/* Visualization Container (80% height container) */}
              <div className="w-full flex-1 flex items-center justify-center min-h-[260px] md:min-h-[340px] bg-[#FAF9F6] border border-black/10">
                {activeFeature.visualizationComponent ? (
                  activeFeature.visualizationComponent
                ) : (
                  <FeatureVisualizationPlaceholder
                    label={
                      activeFeature.visualizationLabel ||
                      `${activeFeature.title} SVG`
                    }
                  />
                )}
              </div>

              {/* Active Feature Description Footer */}
              <div className="w-full border-t border-black/10 pt-4 mt-6">
                <p className="text-xs md:text-sm font-medium text-[#555555] leading-relaxed">
                  {activeFeature.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
