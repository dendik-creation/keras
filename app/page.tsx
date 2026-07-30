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
import changelogHistories from "@/lib/changelog";

gsap.registerPlugin(ScrollTrigger);

const latestVersion = changelogHistories[0]?.version ?? "—";

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
          "[data-reveal], [data-reveal-mask], [data-rule], [data-line-grow]",
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

      // Vertical rail grow — changelog spine
      gsap.utils.toArray<HTMLElement>("[data-line-grow]").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleY: 0 },
          {
            scaleY: 1,
            transformOrigin: "top",
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top 75%",
              end: "bottom 80%",
              scrub: 0.4,
            },
          },
        );
      });

      reveal(".gsap-nav");
      reveal(".gsap-hero-label");
      reveal(".gsap-hero-sub");
      reveal(".gsap-cta-btn");

      reveal(".gsap-statement-label", "#statement");
      reveal(".gsap-statement-body", "#statement");

      reveal(".gsap-features-label", "#features");
      reveal(".gsap-feat-a", ".gsap-feat-grid", 0);
      gsap.fromTo(
        ".gsap-feat-b",
        { x: 32, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.1,
          scrollTrigger: { trigger: ".gsap-feat-grid", start: "top 80%" },
        },
      );

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

      reveal(".gsap-changelog-label", "#changelog");
      reveal(".gsap-changelog-row", ".gsap-changelog-list", 0.06, 16);

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

      gsap.to(".swiss-numeral", {
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-white text-black selection:bg-[#FF3000] selection:text-white overflow-x-hidden font-sans"
    >
      {/* Scroll-progress rule */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-black/10">
        <div ref={progressRef} className="h-full w-full bg-[#FF3000]" />
      </div>

      {/* ─── NAV & HERO WRAPPER (DARK MODE) ─── */}
      <div className="w-full bg-black text-white">
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
              ["#changelog", "Changelog"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="group relative py-1">
                {label}
                <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-[#FF3000] transition-all duration-200 group-hover:w-full" />
              </a>
            ))}
            <Link href="/analytics" className="group relative py-1">
              Analitik
              <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-[#FF3000] transition-all duration-200 group-hover:w-full" />
            </Link>
          </div>
          <GithubStarButton inverted />
        </nav>

      {/* ─── 00. HERO — asymmetric editorial composition ─── */}
      <section
        id="hero"
        className="relative z-10  overflow-hidden px-6 pt-16 pb-10 max-w-7xl mx-auto"
      >
        {/* Bleeding outline numeral — background typography */}
        <span
          aria-hidden="true"
          className="swiss-numeral pointer-events-none select-none absolute -top-16 -right-10 md:right-0 text-[16rem] sm:text-[22rem] md:text-[30rem] font-black leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.08)]"
        >
          00
        </span>

        <div className="gsap-hero-label opacity-0 mb-10 relative">
          <SectionLabel index="00" label="Versi 2 Kayaknya" inverted />
        </div>

        <div className="relative grid lg:grid-cols-12 gap-y-10">
          <h1 className="lg:col-span-8 text-[3.4rem] leading-[0.82] sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase text-white -mx-1">
            <span data-reveal-mask className="block overflow-hidden">
              Adios
            </span>
            <span
              data-reveal-mask
              className="flex items-center overflow-hidden mt-1 sm:text-6xl md:text-7xl lg:text-8xl"
            >
              <RotatingText
                texts={["KRS Ribet", "Penuh Drama", "Manualan"]}
                mainClassName="text-[#FF3000] overflow-hidden justify-start rounded-none"
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

          {/* Offset right column, pinned by a vertical rule — asymmetric weight */}
          <div className="lg:col-span-4 lg:col-start-9 flex gap-6 lg:pt-6">
            <div className="w-0.5 bg-[#FF3000] shrink-0" aria-hidden="true" />
            <p className="gsap-hero-sub opacity-0 text-base md:text-lg text-white/70 leading-relaxed font-medium">
              Untuk kamu yang selalu kesusahan mengatur jadwal mata kuliahmu.{" "}
              <span className="text-white font-black">KeRaS</span> hadir
              sebagai solusi objektif, cepat, jelas, tanpa drama.
            </p>
          </div>
        </div>

        <div className="gsap-cta-btn opacity-0 relative w-full lg:w-fit mt-14">
          <div className="flex flex-col sm:flex-row gap-0 border-2 border-white">
            <Link href="/login">
              <Button className="rounded-none w-full bg-white text-black hover:bg-[#FF3000] hover:text-white uppercase font-black tracking-widest h-16 px-10 text-base transition-colors duration-200 border-0">
                Aku Nak Coba <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <a href="#security">
              <Button className="rounded-none bg-black text-white hover:bg-white hover:text-black uppercase font-black tracking-widest h-16 px-10 text-base transition-colors duration-200 border-0 sm:border-l-2 border-t-2 sm:border-t-0 border-white w-full sm:w-auto">
                Nasib Datamu
              </Button>
            </a>
          </div>
          <InstallPWAButton className="w-full" inverted />
        </div>

        {/* Bottom rule + scroll cue + rotating marker — replaces boxed composition */}
        <div className="relative mt-16 flex items-center justify-between">
          <div
            data-rule
            className="h-0.5 bg-white/20 flex-1 mr-6"
            aria-hidden="true"
          />
          <span className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 shrink-0">
            Gulir <ArrowDown className="w-3.5 h-3.5" />
          </span>
          <div
            className="swiss-rotate ml-6 w-10 h-10 border-2 border-white/20 rounded-full flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <div className="w-1.5 h-1.5 bg-[#FF3000] rounded-full absolute -top-0.5" />
          </div>
        </div>
      </section>
      </div>

      {/* ─── 01. EDITORIAL STATEMENT — whitespace as the content ─── */}
      <section
        id="statement"
        className="relative z-10 border-b-2 border-black px-6 py-24 md:py-36 max-w-7xl mx-auto"
      >
        <div className="gsap-statement-label opacity-0 mb-10">
          <SectionLabel index="01" label="Kenapa KeRaS" />
        </div>
        <p className="gsap-statement-body opacity-0 max-w-4xl text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[1.05]">
          Keras{" "}
          <span className="text-[#FF3000]">Mengamankan</span> 1 semester untukmu  <sup>
            <a
              href="#note-1"
              className="text-[#FF3000] group-hover:text-white hover:underline text-sm font-bold"
            >
              1
            </a>
          </sup> {"& sedikit "} <span className="text-[#FF3000]">Sikma</span>😹
        </p>
      </section>

      {/* ─── 02. FEATURES — asymmetric weighted grid ─── */}
      <section
        id="features"
        className="relative z-10 px-6 py-20 md:py-28 max-w-7xl mx-auto"
      >
        <div className="gsap-features-label opacity-0 mb-14 flex items-end justify-between gap-6">
          <SectionLabel index="02" label="Fitur Utama" />
          <div data-rule className="hidden md:block h-0.5 bg-black flex-1 mb-1.5" />
        </div>

        <div className="gsap-feat-grid grid md:grid-cols-12 border-2 border-black">
          {/* Unified View — double weight */}
          <article className="gsap-feat-a opacity-0 md:col-span-8 md:row-span-2 bg-white md:border-r-2 border-b-2 md:border-b-0 border-black p-8 md:p-14 group hover:bg-[#FF3000] transition-colors duration-200 flex flex-col">
            <div className="flex items-start justify-between mb-10">
              <div className="w-14 h-14 border-2 border-black flex items-center justify-center group-hover:border-white transition-colors duration-200">
                <LayoutDashboard className="w-7 h-7 text-black group-hover:text-white transition-colors duration-200" />
              </div>
              <span className="text-xs font-black tracking-widest text-[#FF3000] group-hover:text-white transition-colors duration-200">
                01
              </span>
            </div>
            <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9] text-black group-hover:text-white mb-4 transition-colors duration-200">
              Unified View
            </h3>
            <p className="text-[#555555] group-hover:text-white/90 leading-relaxed font-medium max-w-md transition-colors duration-200">
              Lihat semua jadwal mata kuliah yang tersedia dalam satu tampilan
              terpadu. Tidak perlu bolak-balik cek detail kelas, semua
              informasi ada di depan mata.
            </p>
            <div
              aria-hidden="true"
              className="mt-auto pt-12 flex justify-end"
            >
              <LayoutDashboard
                strokeWidth={1}
                className="w-24 h-24 md:w-36 md:h-36 text-black/5 group-hover:text-white/15 transition-colors duration-200"
              />
            </div>
          </article>

          {/* Perang KRS */}
          <article className="gsap-feat-b opacity-0 md:col-span-4 bg-black p-8 md:p-10 group hover:bg-[#FF3000] transition-colors duration-200 border-b-2 md:border-b-2 border-black">
            <div className="flex items-start justify-between mb-8">
              <div className="w-12 h-12 border-2 border-white flex items-center justify-center">
                <Swords className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-black tracking-widest text-[#FF3000] group-hover:text-white transition-colors duration-200">
                02
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-3">
              Perang KRS
            </h3>
            <p className="text-white/70 group-hover:text-white leading-snug font-medium text-sm">
              Cukup satu klik, jadwal yang kamu siapkan terkirim cepat ke
              sistem universitas tanpa klik satu-satu.{" "}
              <sup>
                <a
                  href="#note-2"
                  className="text-[#FF3000] group-hover:text-white hover:underline font-bold"
                >
                  2
                </a>
              </sup>
            </p>
          </article>

          {/* Zero Database */}
          <article className="gsap-feat-b opacity-0 md:col-span-4 bg-[#F2F2F2] swiss-dots border-t-0 md:border-t-2 border-black p-8 md:p-10 group hover:bg-black transition-colors duration-200">
            <div className="flex items-start justify-between mb-8">
              <div className="w-12 h-12 border-2 border-black group-hover:border-white flex items-center justify-center transition-colors duration-200">
                <ShieldCheck className="w-6 h-6 text-black group-hover:text-white transition-colors duration-200" />
              </div>
              <span className="text-xs font-black tracking-widest text-[#FF3000]">
                03
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black group-hover:text-white mb-3 transition-colors duration-200">
              Zero Database
            </h3>
            <p className="text-[#555555] group-hover:text-white/80 leading-snug font-medium text-sm transition-colors duration-200">
              Kami tidak menyimpan data pribadimu. Semua informasi diproses
              secara temporer untuk menjaga privasimu tetap aman.
            </p>
          </article>

          {/* Realtime Scrapping — double weight, mirrors first */}
          <article className="gsap-feat-a opacity-0 md:col-span-12 bg-white border-t-2 border-black p-8 md:p-12 group hover:bg-[#FF3000] transition-colors duration-200 grid md:grid-cols-12 md:items-center gap-6">
            <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-4">
              <div className="w-14 h-14 border-2 border-black group-hover:border-white flex items-center justify-center transition-colors duration-200 shrink-0">
                <TextSearch className="w-7 h-7 text-black group-hover:text-white transition-colors duration-200" />
              </div>
              <span className="md:hidden text-xs font-black tracking-widest text-[#FF3000] group-hover:text-white transition-colors duration-200">
                04
              </span>
            </div>
            <h3 className="md:col-span-3 text-3xl md:text-4xl font-black uppercase tracking-tight text-black group-hover:text-white transition-colors duration-200">
              Realtime
              <br />
              Scrapping
            </h3>
            <p className="md:col-span-6 text-[#555555] group-hover:text-white/90 leading-relaxed font-medium transition-colors duration-200">
              List jadwal mata kuliah yang kamu dapatkan selalu terbaru untuk
              memastikan kamu tidak tertinggal ingpo.{" "}
              <sup>
                <a
                  href="#note-3"
                  className="text-[#FF3000] group-hover:text-white font-bold"
                >
                  3
                </a>
              </sup>
            </p>
            <span className="hidden md:block md:col-span-1 text-right text-xs font-black tracking-widest text-[#FF3000] group-hover:text-white transition-colors duration-200">
              04
            </span>
          </article>
        </div>
      </section>

      {/* ─── LARGE TYPOGRAPHY INTERSTITIAL — the breathing pause, no number ─── */}
      <section
        id="word"
        className="relative z-10 border-y-2 border-black px-6 py-24 md:py-40 max-w-7xl mx-auto flex items-center justify-center"
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

      {/* ─── 04. CHANGELOG — vertical editorial rail ─── */}
      <section
        id="changelog"
        className="relative z-10 border-t-2 border-black px-6 py-20 md:py-28 max-w-7xl mx-auto"
      >
        <div className="gsap-changelog-label opacity-0 mb-16 md:mb-24">
          <SectionLabel index="04" label="Changelog" />
          <h2 className="mt-6 text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] uppercase text-black">
            Perjalanan KeRaS
            <span className="block text-[#FF3000]">Apa Aja Sih</span>
          </h2>
        </div>

        <ol className="gsap-changelog-list relative pl-8 md:pl-12">
          <div
            data-line-grow
            aria-hidden="true"
            className="absolute left-0 top-1 bottom-1 w-0.5 bg-black origin-top"
          />
          {changelogHistories.map((item, idx) => {
            const isLatest = idx === 0;
            return (
              <li
                key={item.version}
                className={`gsap-changelog-row opacity-0 relative pb-10 md:pb-14 last:pb-0 ${
                  isLatest ? "" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute -left-8 md:-left-12 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                    isLatest ? "bg-[#FF3000] border-[#FF3000]" : "bg-white border-black"
                  }`}
                />
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-4 gap-y-1 mb-2">
                  <span className="text-xs font-black tracking-widest text-[#FF3000] tabular-nums">
                    v{item.version}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#555555]">
                    {item.date}
                  </span>
                </div>
                <h3
                  className={`font-black uppercase tracking-tight mb-2 ${
                    isLatest
                      ? "text-3xl md:text-5xl"
                      : "text-xl md:text-2xl text-black/80"
                  }`}
                >
                  {item.title}
                </h3>
                <ul
                  className={`space-y-1 max-w-2xl ${isLatest ? "text-base" : "text-sm"} text-[#555555] font-medium`}
                >
                  {item.changes.map((change, cIdx) => (
                    <li key={cIdx} className="flex gap-2">
                      <span className="text-[#FF3000] font-black shrink-0">
                        —
                      </span>
                      {change}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ─── 05. ANALYTICS PREVIEW — poster CTA, not a card ─── */}
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
                  05
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
            lebih tenang,
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
              <Link href="/privacy" className="text-sm font-bold uppercase tracking-widest text-white/70 hover:text-[#FF3000] transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm font-bold uppercase tracking-widest text-white/70 hover:text-[#FF3000] transition-colors">
                Terms
              </Link>
            </div>
          </div>

          <div className="w-full h-0.5 bg-white/20" />

          <div className="w-full flex flex-col items-start gap-2">
            <small
              className="text-sm text-white/50 font-medium leading-tight"
              id="note-1"
            >
              1. Bergantung terhadap ketersediaan kelas yang dibuka universitas.
            </small>
            <small
              className="text-sm text-white/50 font-medium leading-tight"
              id="note-2"
            >
              2. Peningkatan peluang bergantung pada performa sistem dari situs
              resmi universitas.
            </small>
            <small
              className="text-sm text-white/50 font-medium leading-tight"
              id="note-3"
            >
              3. Trigger manual dari mahasiswa untuk mendapatkan jadwal
              terbaru.
            </small>
          </div>
          <div className="w-full flex flex-col items-start gap-2">
            <small
              className="text-sm text-white/50 font-medium leading-tight"
            >
              Part of <a href="https://dendikcreation.dev?utm_source=keras?utm_medium=page?utm_campaign=page_load" target="_blank" className="text-white hover:text-[#FF3000]">dendik-creation</a>
            </small>
          </div>
        </div>
      </footer>
    </div>
  );
}
