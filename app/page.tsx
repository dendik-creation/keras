"use client";

/**
 * DIRECTION CONTRACT
 * THESIS: landing reads as a sequence of distinct exhibition posters, not repeating SaaS cards.
 * OWN-WORLD: pure white/black/#FF3000, 2px hard borders, oversized uppercase grotesque type,
 *   numbered labels, swiss grid/dot textures — inherited verbatim, never softened.
 * STORY: student sees KRS chaos named, solved, proven safe, versioned, then invited to act.
 * FIRST VIEWPORT: asymmetric hero — bleeding outline numeral behind cropped stacked headline,
 *   offset sub-column pinned right of a vertical red rule, CTA row, scroll rule beneath.
 * FORM: extend existing surface — same system, new per-section composition (statement, grid,
 *   interstitial word, split-column security, vertical editorial rail, poster CTA, poster footer).
 */

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Github,
  LayoutDashboard,
  ArrowRight,
  ArrowDown,
  ExternalLink,
  TextSearch,
  Swords,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import RotatingText from "@/components/RotatingText";
import InstallPWAButton from "@/components/custom/InstallPWAButton";
import GithubStarButton from "@/components/custom/GithubStarButton";
import ContributionGrid from "@/components/landing/ContributionGrid";
import CenterFlow from "@/components/landing/CenterFlow";
import MagicBento from "@/components/landing/MagicBento";

gsap.registerPlugin(ScrollTrigger);

function SectionLabel({ index, label, inverted }: { index: string; label: string; inverted?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-[#FF3000] font-black text-sm tracking-widest tabular-nums">
        {index}
      </span>
      <div className="w-8 h-0.5 bg-[#FF3000]" />
      <span className={`text-xs font-bold uppercase tracking-widest ${inverted ? 'text-white' : 'text-black'}`}>
        {label}
      </span>
    </div>
  );
}

export default function Page() {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // Top scroll-progress rule — editorial, not decorative
      if (progressRef.current) {
        gsap.set(progressRef.current, { scaleX: 0, transformOrigin: "left" });
        ScrollTrigger.create({
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.3,
          onUpdate: (self) =>
            gsap.set(progressRef.current, { scaleX: self.progress }),
        });
      }

      if (reduced) {
        gsap.set(
          "[data-reveal], [data-reveal-mask], [data-rule]",
          { opacity: 1, y: 0, x: 0, clipPath: "inset(0 0 0 0)", scaleX: 1, scaleY: 1 },
        );
        return;
      }

      // Fade-up reveal for ordinary editorial blocks
      const reveal = (
        selector: string,
        trigger: string = selector,
        stagger = 0,
        distance = 28,
      ) => {
        gsap.fromTo(
          selector,
          { y: distance, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            stagger,
            scrollTrigger: { trigger, start: "top 85%" },
          },
        );
      };

      // Masked typography reveal — clip-path wipe, the signature move
      gsap.utils.toArray<HTMLElement>("[data-reveal-mask]").forEach((el) => {
        gsap.fromTo(
          el,
          { clipPath: "inset(0 0 100% 0)" },
          {
            clipPath: "inset(0 0 0% 0)",
            duration: 0.8,
            ease: "power3.inOut",
            scrollTrigger: { trigger: el, start: "top 88%" },
          },
        );
      });

      // Horizontal rule draw
      gsap.utils.toArray<HTMLElement>("[data-rule]").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          {
            scaleX: 1,
            transformOrigin: "left",
            duration: 0.9,
            ease: "power2.inOut",
            scrollTrigger: { trigger: el, start: "top 90%" },
          },
        );
      });



      reveal(".gsap-nav");
      reveal(".gsap-hero-label");
      reveal(".gsap-hero-sub");
      reveal(".gsap-cta-btn");
      reveal(".gsap-hero-preview");

      // CenterFlow and FeatureShowcase handle their own GSAP animations internally

      gsap.fromTo(
        ".gsap-word",
        { scale: 0.9, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: "#word", start: "top 70%" },
        },
      );

      reveal(".gsap-security-label", "#security");
      reveal(".gsap-security-col", "#security", 0.12);



      reveal(".gsap-analytics-content", "#analytics-preview");

      reveal(".gsap-footer-content", "footer");

      // Precise mechanical geometry — hero only
      gsap.to(".swiss-rotate", {
        rotation: 360,
        duration: 26,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });

      // swiss-numeral removed — decorative bg numeral replaced by low-opacity watermark
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-white text-black selection:bg-[#FF3000] selection:text-white font-sans"
    >
      {/* Scroll-progress rule */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-black/10">
        <div ref={progressRef} className="h-full w-full bg-[#FF3000]" />
      </div>

      {/* ─── NAV & HERO WRAPPER (DARK MODE) ─── */}
      <div className="w-full bg-[#050505] text-white h-screen overflow-hidden relative">
        {/* ─── CONTRIBUTION GRID AMBIENT BG ─── */}
        <ContributionGrid />
        {/* ─── NAV ─── */}
        <nav className="gsap-nav opacity-0 relative z-20 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b-2 border-white/20">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="KeRaS"
              width={32}
              height={32}
              className="w-8 h-8 object-contain bg-white rounded-sm p-0.5"
              priority
            />
            <span className="text-xl font-black tracking-tighter text-white">
              KeRaS.
            </span>
          </div>
          <div className="hidden md:flex gap-10 text-xs font-bold text-white uppercase tracking-widest">
            {[
              ["#features", "Fitur"],
              ["#security", "Keamanan"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="group relative py-1">
                {label}
                <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-[#FF3000] transition-all duration-200 group-hover:w-full" />
              </a>
            ))}
            <Link href="/changelog" className="group relative py-1">
              Changelog
              <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-[#FF3000] transition-all duration-200 group-hover:w-full" />
            </Link>
            <Link href="/analytics" className="group relative py-1">
              Analitik
              <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-[#FF3000] transition-all duration-200 group-hover:w-full" />
            </Link>
          </div>
          <div className="flex gap-3 items-center">
          <GithubStarButton inverted />
          <InstallPWAButton inverted simple />
          </div>
        </nav>

      {/* ─── 00. HERO — centered editorial composition ─── */}
      <section
        id="hero"
        className="relative z-10 overflow-hidden px-6 pt-20 pb-0 max-w-7xl mx-auto"
      >

        {/* Headline — centered, two-line, orange on line 2 only */}
        <h1 className="text-center text-[3.2rem] leading-[0.85] sm:text-6xl md:text-[5rem] lg:text-[7rem] xl:text-[5.5rem] font-black tracking-tighter text-white mb-8">
          <span data-reveal-mask className="block overflow-hidden">
            Adios
          </span>
          <span
            data-reveal-mask
            className="block overflow-hidden mt-2"
          >
            <RotatingText
              texts={["KRS Ribet", "Penuh Drama", "Manualan"]}
              mainClassName="text-[#FF3000] overflow-hidden justify-center rounded-none"
              staggerFrom={"last"}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.02}
              splitLevelClassName="overflow-hidden"
              transition={{ type: "", damping: 30, stiffness: 400 }}
              rotationInterval={2200}
            />
          </span>
        </h1>

        {/* Description — centered, max 600px, below headline */}
        <p className="gsap-hero-sub opacity-0 text-base md:text-lg text-white/70 leading-relaxed font-medium text-center mx-auto mb-8 max-w-[600px]">
          Untuk kamu yang selalu kesusahan mengatur jadwal mata kuliahmu.{" "}
          <span className="text-white font-black">KeRaS</span> hadir
          sebagai solusi objektif, cepat, jelas, tanpa drama.
        </p>

        {/* CTA — GitHub-inspired horizontal layout */}
        <div className="gsap-cta-btn opacity-0 flex flex-col items-center gap-4 mb-16">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <Link href="/login">
              <Button className="rounded-none w-full sm:w-auto bg-[#FF3000] text-white hover:bg-white hover:text-black uppercase font-black tracking-widest h-12 px-8 text-sm transition-colors duration-200 border-0">
                Mulai Sekarang <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Product Preview — responsive image placeholders */}
        {/* ────────────────────────────────────────────────────────────────
          To swap: replace the placeholder <div> content inside each
          .hero-preview-desktop or .hero-preview-mobile with an <Image />
          using the same aspect ratio class.
        ──────────────────────────────────────────────────────────────── */}
        <div className="gsap-hero-preview opacity-0">

          {/* ── Desktop ─ md+ ── */}
          <div className="hero-preview-desktop hidden md:block w-[88%] mx-auto">
            {/* Browser chrome */}
            <div className="border-2 border-white/15 rounded-t-md px-4 py-2.5 flex items-center gap-2 bg-white/[0.04]">
              <div className="flex gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/40 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500/40 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40 block" />
              </div>
              <span className="flex-1 mx-3 text-[10px] font-mono text-white/70 bg-white/5 px-3 py-1 rounded-sm truncate">
                keras.dendikcreation.dev/schedule
              </span>
            </div>
            {/* Screenshot — inside browser frame */}
            <div className="relative border-x-2 border-b-2 border-white/15 rounded-b-md overflow-hidden aspect-video">
              <Image
                src="/landing_images/hero_desktop.png"
                alt="KeRaS Desktop — Schedule Generator"
                fill
                className="object-cover object-top"
                priority
              />
            </div>
          </div>

          {/* ── Mobile ─ < md ── */}
          <div className="hero-preview-mobile block md:hidden w-96 mx-auto">
            <div className="border-2 border-white/15 rounded-[2rem] overflow-hidden">
              {/* Notch */}
              <div className="bg-white/[0.04] px-6 py-3 flex justify-center border-b border-white/10">
                <div className="w-14 h-1 bg-white/20 rounded-full" />
              </div>
              {/* Screenshot — inside phone frame */}
              <div className="relative aspect-[9/20]">
                <Image
                  src="/landing_images/hero_mobile.png"
                  alt="KeRaS Mobile — Schedule Generator"
                  fill
                  className="object-cover object-top"
                />
              </div>
              {/* Home bar */}
              <div className="bg-white/[0.04] px-6 py-3 flex justify-center border-t border-white/10">
                <div className="w-20 h-1 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* ─── 01. CENTER FLOW — orchestration architecture diagram ─── */}
      <CenterFlow />

      {/* ─── 02. FEATURES — Magic Bento Grid ─── */}
      <section
        id="features"
        className="relative z-10 px-6 py-20 md:py-28 max-w-7xl mx-auto bg-white text-black"
      >
        <div className="mb-12 flex items-end justify-between gap-6">
          <SectionLabel index="02" label="FITUR UTAMA" />
          <div data-rule className="hidden md:block h-0.5 bg-black flex-1 mb-1.5" />
        </div>

        <MagicBento
          textAutoHide={true}
          enableStars={true}
          enableSpotlight={true}
          enableBorderGlow={true}
          enableTilt={true}
          enableMagnetism={true}
          clickEffect={true}
          spotlightRadius={300}
          particleCount={12}
          glowColor="255, 48, 0"
        />
      </section>

      {/* ─── LARGE TYPOGRAPHY INTERSTITIAL — the breathing pause, no number ─── */}
      <section
        id="word"
        className="relative z-10 border-b-2 border-black px-6 py-24 md:py-40 max-w-7xl mx-auto flex items-center justify-center"
      >
        <h2 className="gsap-word opacity-0 text-center text-6xl sm:text-8xl md:text-[10rem] font-black uppercase tracking-tighter leading-none">
          Objektif<span className="text-[#FF3000]">.</span>
        </h2>
      </section>

      {/* ─── 03. SECURITY — split editorial statement, no cards ─── */}
      <section
        id="security"
        className="relative z-10 bg-[#F2F2F2] swiss-grid-pattern"
      >
        <div className="px-6 py-20 md:py-28 max-w-7xl mx-auto">
          <div className="gsap-security-label opacity-0 mb-14">
            <SectionLabel index="03" label="Keamanan" />
          </div>

          <div className="grid md:grid-cols-2 border-t-2 border-black">
            <div className="gsap-security-col opacity-0 md:border-r-2 border-b-2 md:border-b-0 border-black p-8 md:p-14">
              <span
                aria-hidden="true"
                className="block text-[5rem] md:text-[7rem] font-black leading-none text-transparent [-webkit-text-stroke:1.5px_black] mb-6"
              >
                01
              </span>
              <h3 className="text-3xl md:text-5xl font-black tracking-tighter leading-[0.9] mb-6">
                Yang KeRaS.
                <br />
                <span className="text-[#FF3000]">Simpan</span>
              </h3>
              <p className="text-[#555555] leading-relaxed font-medium max-w-md">
              Hanya aktivitasmu untuk analitik dan sebagai bahan evaluasi KeRaS berikutnya.
              </p>
            </div>

            <div className="gsap-security-col opacity-0 p-8 md:p-14 bg-black">
              <span
                aria-hidden="true"
                className="block text-[5rem] md:text-[7rem] font-black leading-none text-transparent [-webkit-text-stroke:1.5px_white] mb-6"
              >
                02
              </span>
              <h3 className="text-3xl md:text-5xl font-black tracking-tighter leading-[0.9] mb-6 text-white">
                Yang Tidak
                <br />
                <span className="text-[#FF3000]">KeRaS. Sentuh</span>
              </h3>
              <p className="text-white/70 leading-relaxed font-medium max-w-md">
                <strong className="text-white">KeRaS</strong> hanya
                menggunakan sesi login kamu untuk akses situs resmi KRS
                universitas sebagai jembatan konten mata kuliah. Udah itu aja.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 04. ANALYTICS PREVIEW — poster CTA, not a card ─── */}
      <section
        id="analytics-preview"
        className="relative z-10 border-t-2 border-black bg-black"
      >
        <Link
          href="/analytics"
          className="group block px-6 py-20 md:py-28 max-w-7xl mx-auto hover:bg-[#FF3000] transition-colors duration-200"
        >
          <div className="gsap-analytics-content opacity-0 grid md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-8">
              <div className="mb-8 flex items-center gap-4">
                <span className="text-[#FF3000] group-hover:text-white font-black text-sm tracking-widest tabular-nums transition-colors duration-200">
                  04
                </span>
                <div className="w-8 h-0.5 bg-[#FF3000] group-hover:bg-white transition-colors duration-200" />
                <span className="text-xs font-bold uppercase tracking-widest text-white transition-colors duration-200">
                  Analitik
                </span>
              </div>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.88] text-white">
                Lihat Data
                <br />
                Penggunaan
              </h2>
              <p className="mt-6 text-white/60 group-hover:text-white/90 font-medium max-w-md transition-colors duration-200">
                Dashboard publik, terbuka untuk siapa saja. Semua metrik
                dikumpulkan secara anonim.
              </p>
            </div>
            <div className="md:col-span-4 flex md:justify-end items-center gap-3">
              <span className="text-white group-hover:text-white font-black tracking-widest text-sm flex items-center gap-2">
                Buka Dashboard{" "}
                <ExternalLink className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </span>
            </div>
          </div>
          {/* Ornamental bar motif — graphic rhythm, not a data claim */}
          <div
            aria-hidden="true"
            className="mt-14 flex items-end gap-1.5 h-16 md:h-20"
          >
            {[40, 65, 30, 90, 55, 70, 25, 100, 45, 80, 35, 60, 50, 75, 20, 95, 40, 65, 30, 85].map(
              (h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-[#FF3000] group-hover:bg-white transition-colors duration-200"
                  style={{ height: `${h}%` }}
                />
              ),
            )}
          </div>
        </Link>
      </section>

      {/* ─── FOOTER — final poster ─── */}
      <footer className="relative z-10 bg-black border-t-2 border-black">
        <div className="gsap-footer-content opacity-0 max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col items-start gap-10">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="KeRaS"
              width={32}
              height={32}
              className="w-8 h-8 object-contain bg-white"
            />
            <span className="text-xl font-black tracking-tighter text-white">
              KeRaS.
            </span>
          </div>

          <h3 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white max-w-3xl leading-[0.92]">
            KRS-an jadi
            <br />
            <span className="text-[#FF3000]">lebih tenang</span>,
            <br />
            kelas incaran pun{" "}
            <span className="text-[#FF3000]">aman.</span>
          </h3>

          <div className="flex flex-col sm:flex-row gap-6 sm:items-center w-full">
            <a href="https://github.com/dendik-creation/keras/" target="_blank" rel="noreferrer">
              <Button
                variant="outline"
                className="rounded-none border-2 border-white bg-transparent text-white hover:bg-[#FF3000] hover:border-[#FF3000] gap-2 uppercase font-bold tracking-widest transition-colors duration-200"
              >
                <Github className="w-4 h-4" /> kasih star 😁
              </Button>
            </a>

            <div className="flex items-center gap-6">
              <Link href="/changelog" className="text-sm font-bold uppercase tracking-widest text-white/70 hover:text-[#FF3000] transition-colors">
                Changelog
              </Link>
              <Link href="/privacy" className="text-sm font-bold uppercase tracking-widest text-white/70 hover:text-[#FF3000] transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm font-bold uppercase tracking-widest text-white/70 hover:text-[#FF3000] transition-colors">
                Terms
              </Link>
            </div>
          </div>

          <div className="w-full flex flex-col items-start gap-2">
            <small
              className="text-sm text-white/50 font-medium leading-tight"
            >
              Part of <a href="https://dendikcreation.dev?utm_source=keras?utm_medium=page?utm_campaign=page_load" target="_blank" className="text-white hover:text-[#FF3000]">dendik-creation</a> projects
            </small>
          </div>
        </div>
      </footer>
    </div>
  );
}
