"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Github,
  EyeOff,
  LayoutDashboard,
  ArrowRight,
  TextSearch,
  CalendarSync,
  Swords,
  Server,
  Star,
} from "lucide-react";
import Link from "next/link";
import RotatingText from "@/components/RotatingText";
import changelogHistories from "@/lib/changelog";
import Timeline, {
  TimelineItem,
  TimelineItemDate,
  TimelineItemTitle,
  TimelineItemDescription,
} from "@/components/ui/timeline";

gsap.registerPlugin(ScrollTrigger);

// ─── Inline SVG Bauhaus Primitives ───────────────────────────────────────────
function BauhausSquare({
  size = 80,
  color = "#D02020",
  borderColor = "#121212",
  className = "",
}: {
  size?: number;
  color?: string;
  borderColor?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: "visible" }}
    >
      <rect
        x="4"
        y="4"
        width="72"
        height="72"
        fill={color}
        stroke={borderColor}
        strokeWidth="4"
      />
    </svg>
  );
}

function BauhausCircle({
  size = 80,
  color = "#1040C0",
  borderColor = "#121212",
  className = "",
}: {
  size?: number;
  color?: string;
  borderColor?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: "visible" }}
    >
      <circle
        cx="40"
        cy="40"
        r="36"
        fill={color}
        stroke={borderColor}
        strokeWidth="4"
      />
    </svg>
  );
}

function BauhausTriangle({
  size = 80,
  color = "#F0C020",
  borderColor = "#121212",
  className = "",
}: {
  size?: number;
  color?: string;
  borderColor?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ overflow: "visible" }}
    >
      <polygon
        points="40,6 74,70 6,70"
        fill={color}
        stroke={borderColor}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BauhausHalfCircle({
  size = 80,
  color = "#D02020",
  borderColor = "#121212",
  className = "",
}: {
  size?: number;
  color?: string;
  borderColor?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size / 2}
      viewBox="0 0 80 40"
      className={className}
      style={{ overflow: "visible" }}
    >
      <path
        d="M 4 40 A 36 36 0 0 1 76 40"
        fill={color}
        stroke={borderColor}
        strokeWidth="4"
      />
    </svg>
  );
}

export default function Page() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // ── NAV ──────────────────────────────────────────────────────────
      gsap.from(".gsap-nav", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });

      // ── HERO BADGE ───────────────────────────────────────────────────
      gsap.from(".gsap-hero-badge", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        delay: 0.1,
      });

      // ── HERO HEADLINE (slide-up per line) ────────────────────────────
      gsap.from(".gsap-headline-line", {
        y: 50,
        opacity: 0,
        duration: 0.65,
        ease: "power3.out",
        stagger: 0.15,
        delay: 0.2,
      });

      // ── HERO SUB-COPY ─────────────────────────────────────────────────
      gsap.from(".gsap-hero-sub", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        delay: 0.5,
      });

      // ── CTA BUTTON ───────────────────────────────────────────────────
      gsap.from(".gsap-cta-btn", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        delay: 0.65,
      });

      // ── CTA BUTTON ───────────────────────────────────────────────────
      gsap.to(".gsap-cta-btn", {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power3.in",
        delay: 0.65,
      });

      // ── HERO BANDS ───────────────────────────────────────────────────
      gsap.from(".gsap-hero-bands > div", {
        y: 30,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.1,
        delay: 0.4,
      });

      // ── BAUHAUS SVG SHAPES — infinite loops ──────────────────────────
      // Rotating square (hero bg top-left)
      gsap.to(".bauhaus-sq-1", {
        rotation: 360,
        duration: 16,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
      // Counter-rotating square (features section)
      gsap.to(".bauhaus-sq-2", {
        rotation: -360,
        duration: 22,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
      // Rotating triangle (hero mid-right)
      gsap.to(".bauhaus-tri-1", {
        rotation: 360,
        duration: 20,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
      // Counter-rotating triangle (security section)
      gsap.to(".bauhaus-tri-2", {
        rotation: -360,
        duration: 14,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
      // Floating circles
      gsap.to(".bauhaus-cir-1", {
        y: "-=20",
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        duration: 2.8,
      });
      gsap.to(".bauhaus-cir-2", {
        y: "+=18",
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        duration: 3.2,
      });
      gsap.to(".bauhaus-cir-3", {
        y: "-=14",
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        duration: 2.2,
      });
      // Floating half-circle
      gsap.to(".bauhaus-half-1", {
        y: "-=12",
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        duration: 4.0,
      });

      // ── FEATURES SECTION ─────────────────────────────────────────────
      gsap.from(".gsap-features-label", {
        y: 50,
        opacity: 0,
        duration: 0.55,
        ease: "power3.out",
        scrollTrigger: { trigger: "#features", start: "top 80%" },
      });
      gsap.from(".gsap-features-heading", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: "#features", start: "top 78%" },
      });
      gsap.from(".gsap-feat-card", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: ".gsap-feat-grid", start: "top 80%" },
      });

      // ── SECURITY SECTION ─────────────────────────────────────────────
      gsap.from(".gsap-security-heading", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: "#security", start: "top 80%" },
      });
      gsap.from(".gsap-security-card", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: ".gsap-security-grid", start: "top 80%" },
      });

      // ── CHANGELOG ────────────────────────────────────────────────────
      gsap.from(".gsap-changelog-heading", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: "#changelog", start: "top 80%" },
      });
      gsap.from(".gsap-changelog-body", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: "#changelog", start: "top 72%" },
      });

      // ── FOOTER ───────────────────────────────────────────────────────
      gsap.from(".gsap-footer-content", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: "footer", start: "top 90%" },
      });
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#F0F0F0] text-[#121212] selection:bg-[#F0C020] selection:text-[#121212] overflow-x-hidden font-sans relative"
    >
      {/* ─── NAV ─── */}
      <nav className="gsap-nav relative z-20 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b-4 border-[#121212]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#D02020] flex items-center justify-center border-2 border-[#121212]">
            <CalendarSync className="text-white w-4 h-4" />
          </div>
          <span className="text-xl font-black tracking-tighter text-[#121212]">
            KeRaS.
          </span>
        </div>
        <div className="hidden md:flex gap-10 text-sm font-bold text-[#121212] uppercase tracking-wider">
          <a
            href="#features"
            className="hover:text-[#D02020] transition-colors"
          >
            Fitur
          </a>
          <a
            href="#security"
            className="hover:text-[#D02020] transition-colors"
          >
            Keamanan
          </a>
          <a
            href="#changelog"
            className="hover:text-[#D02020] transition-colors"
          >
            Changelog
          </a>
        </div>
        <a href="https://github.com/dendik-creation/keras/" target="_blank">
          <Button
            variant="outline"
            className="rounded-none border-2 border-[#121212] bg-[#F0C020] text-[#121212] hover:bg-[#121212] hover:text-[#F0C020] shadow-[4px_4px_0px_0px_#121212] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none uppercase font-bold tracking-wider transition-all"
          >
            <Star className="w-4 h-4 mr-2" /> Ramaikan
          </Button>
        </a>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative z-10 overflow-hidden">
        <div className="w-full h-3 bg-[#F0C020]" />

        <div className="relative flex flex-col items-center px-6 pt-20 pb-0 max-w-5xl mx-auto">
          {/* Rotating Square — top-left */}
          <div className="bauhaus-sq-1 absolute top-6 left-0 -translate-x-1/2 hidden md:block opacity-90 pointer-events-none">
            <BauhausSquare size={120} color="#1040C0" />
          </div>
          {/* Floating Circle — top-right */}
          <div className="bauhaus-cir-1 absolute top-8 right-8 hidden md:block opacity-80 pointer-events-none">
            <BauhausCircle size={80} color="#D02020" />
          </div>
          {/* Rotating Triangle — mid-right */}
          <div className="bauhaus-tri-1 absolute top-52 right-4 hidden md:block opacity-70 pointer-events-none">
            <BauhausTriangle size={60} color="#F0C020" />
          </div>
          {/* Floating Half-circle — lower-left */}
          <div className="bauhaus-half-1 absolute bottom-20 left-8 hidden md:block opacity-60 pointer-events-none">
            <BauhausHalfCircle size={100} color="#1040C0" />
          </div>
          {/* Small floating circle — accent */}
          <div className="bauhaus-cir-2 absolute top-40 left-16 hidden md:block opacity-50 pointer-events-none">
            <BauhausCircle size={32} color="#F0C020" />
          </div>

          {/* Badge */}
          <div className="gsap-hero-badge inline-flex items-center gap-2 bg-[#1040C0] text-white border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] px-4 py-1.5 mb-8 uppercase tracking-widest text-xs font-black">
            <span className="w-2 h-2 bg-[#F0C020] inline-block" />
            Woi Coba Dulu
          </div>

          {/* Headline */}
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-6 leading-[0.88] text-[#121212] text-center uppercase w-full">
            <div className="gsap-headline-line">ADIOS</div>
            <div className="gsap-headline-line flex justify-center items-center mt-2">
              <RotatingText
                texts={["KRS RIBET", "PENUH DRAMA", "MANUALAN"]}
                mainClassName="px-2 sm:px-2 md:px-3 text-[#D02020] overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-none"
                staggerFrom={"last"}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                staggerDuration={0.025}
                splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                transition={{ type: "", damping: 30, stiffness: 400 }}
                rotationInterval={2000}
              />
            </div>
          </h1>

          {/* Sub-copy */}
          <p className="gsap-hero-sub text-lg md:text-xl text-[#555555] max-w-2xl mx-auto mb-12 leading-relaxed font-medium text-center">
            Untuk kamu yang selalu kesusahan mengatur jadwal mata kuliahmu.{" "}
            <span className="text-[#121212] font-black">KeRaS</span> hadir
            sebagai solusi untukmu.
          </p>

          {/* CTA */}
          <div className="flex justify-center items-center mb-0">
            <Link href={"/login"}>
              <Button
                size="lg"
                className="gsap-cta-btn w-full md:w-[360px] bg-[#D02020] text-white border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] rounded-none uppercase font-black tracking-widest h-16 text-lg hover:-translate-y-1 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                Yuk Coba <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Bottom color bands */}
        <div className="gsap-hero-bands w-full flex mt-16">
          <div className="flex-1 h-4 bg-[#D02020] border-t-4 border-[#121212]" />
          <div className="flex-1 h-4 bg-[#1040C0] border-t-4 border-[#121212]" />
          <div className="flex-1 h-4 bg-[#F0C020] border-t-4 border-[#121212]" />
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section
        id="features"
        className="relative z-10 px-6 py-24 max-w-7xl mx-auto"
      >
        {/* Counter-rotating square in bg */}
        <div className="bauhaus-sq-2 absolute top-16 right-4 opacity-[0.06] pointer-events-none hidden md:block">
          <BauhausSquare size={200} color="#1040C0" borderColor="#1040C0" />
        </div>

        <div className="gsap-features-label flex items-center gap-4 mb-2">
          <div className="w-8 h-1 bg-[#D02020]" />
          <span className="text-xs font-black uppercase tracking-widest text-[#D02020]">
            Fitur Utama
          </span>
        </div>
        <h2 className="gsap-features-heading text-5xl md:text-7xl font-black tracking-tighter mb-12 leading-[0.9] uppercase text-[#121212]">
          Apa Saja <br />
          <span className="text-[#1040C0]">Keahliannya</span>
        </h2>

        <div className="gsap-feat-grid grid md:grid-cols-12 gap-0 border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212]">
          {/* Unified View */}
          <div className="gsap-feat-card md:col-span-7 bg-white border-r-0 md:border-r-4 border-b-4 md:border-b-0 border-[#121212] p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#1040C0] border-l-4 border-b-4 border-[#121212]" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-[#F0C020] border-4 border-[#121212] flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
                <LayoutDashboard className="w-7 h-7 text-[#121212]" />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight text-[#121212] mb-3">
                Unified View
              </h3>
              <p className="text-[#555555] leading-relaxed font-medium max-w-md">
                Lihat semua jadwal mata kuliah yang tersedia dalam satu tampilan
                terpadu. Tidak perlu bolak-balik cek detail kelas, semua
                informasi ada di depan mata.
              </p>
            </div>
          </div>

          {/* Perang KRS */}
          <div className="gsap-feat-card md:col-span-5 bg-[#1040C0] p-10 relative overflow-hidden group border-b-4 md:border-b-0 border-[#121212]">
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-[#F0C020] border-t-4 border-l-4 border-[#121212]" />
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#D02020] border-2 border-[#121212]" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-full bg-white border-4 border-[#121212] flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_#121212]">
                <Swords className="w-7 h-7 text-[#1040C0]" />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight text-white mb-3">
                Perang KRS
              </h3>
              <p className="text-blue-100 leading-snug font-medium">
                Cukup dengan satu klik, Jadwal yang kamu siapkan akan terkirim
                dengan cepat ke sistem universitas tanpa klik satu-satu kembali.{" "}
                <sup>
                  <a
                    href="#note-1"
                    className="text-[#F0C020] hover:underline font-bold"
                  >
                    1
                  </a>
                </sup>
              </p>
            </div>
          </div>

          {/* Zero Database */}
          <div className="gsap-feat-card md:col-span-5 bg-white border-r-0 md:border-r-4 border-t-4 border-[#121212] p-10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-16 h-16 bg-[#D02020] border-r-4 border-b-4 border-[#121212]" />
            <div className="relative z-10 pt-4">
              <div className="w-14 h-14 bg-[#121212] border-4 border-[#121212] flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
                <ShieldCheck className="w-7 h-7 text-[#F0C020]" />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight text-[#121212] mb-3">
                Zero Database
              </h3>
              <p className="text-[#555555] leading-snug font-medium">
                Kami tidak menyimpan data pribadimu. Semua informasi diproses
                secara temporer untuk menjaga privasimu tetap aman.
              </p>
            </div>
          </div>

          {/* Realtime Scrapping */}
          <div className="gsap-feat-card md:col-span-7 bg-[#F0C020] border-t-4 border-[#121212] p-10 relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#121212] border-t-4 border-l-4 border-[#121212]" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-white border-4 border-[#121212] flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_#121212]">
                <TextSearch className="w-7 h-7 text-[#121212]" />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight text-[#121212] mb-3">
                Realtime Scrapping
              </h3>
              <p className="text-[#121212]/70 leading-relaxed font-medium max-w-md">
                List jadwal mata kuliah yang kamu dapatkan selalu terbaru untuk
                memastikan kamu tidak tertinggal ingpo.{" "}
                <sup>
                  <a href="#note-2" className="text-[#D02020] font-bold">
                    2
                  </a>
                </sup>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECURITY SECTION ─── */}
      <section
        id="security"
        className="relative z-10 px-6 py-24 max-w-7xl mx-auto"
      >
        {/* Counter-rotating triangle in bg */}
        <div className="bauhaus-tri-2 absolute top-20 left-4 opacity-[0.06] pointer-events-none hidden md:block">
          <BauhausTriangle size={160} color="#D02020" borderColor="#D02020" />
        </div>

        <div className="flex items-center gap-4 mb-2">
          <div className="w-8 h-1 bg-[#1040C0]" />
          <span className="text-xs font-black uppercase tracking-widest text-[#1040C0]">
            Keamanan
          </span>
        </div>
        <h2 className="gsap-security-heading text-5xl md:text-7xl font-black tracking-tighter mb-12 leading-[0.9] uppercase text-[#121212]">
          Nasib Datamu <span className="text-[#D02020]">Bagaimana?</span>
        </h2>

        <div className="gsap-security-grid grid md:grid-cols-12 gap-0 border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212]">
          <div className="gsap-security-card md:col-span-5 bg-[#121212] border-r-0 md:border-r-4 border-[#121212] p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#D02020] border-l-4 border-b-4 border-[#F0F0F0]/20" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-full bg-[#D02020] border-4 border-white flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_#D02020]">
                <EyeOff className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight text-white mb-3">
                No Tracking
              </h3>
              <p className="text-[#888] leading-snug font-medium">
                Aktivitasmu tidak terekam sama sekali sejak kamu login hingga
                kamu logout kembali
              </p>
            </div>
          </div>
          <div className="gsap-security-card md:col-span-7 bg-[#121212] p-10 relative overflow-hidden group border-t-4 md:border-t-0 border-[#D02020]">
            <div className="bauhaus-cir-3 absolute bottom-4 right-4 opacity-20 pointer-events-none">
              <BauhausCircle size={96} color="#1040C0" borderColor="#F0C020" />
            </div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-[#1040C0] border-4 border-white flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
                <Server className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tight text-white mb-3">
                Just Accessing
              </h3>
              <p className="text-[#888] leading-relaxed font-medium max-w-md">
                <strong className="text-white">KeRaS</strong> menggunakan sesi
                login kamu untuk akses situs resmi krs universitas sebagai
                jembatan konten mata kuliah untuk jadwalmu. Udah itu aja.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CHANGELOG SECTION ─── */}
      <section
        id="changelog"
        className="relative z-10 px-6 py-24 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="w-8 h-1 bg-[#F0C020]" />
          <span className="text-xs font-black uppercase tracking-widest text-[#F0C020] bg-[#121212] px-2 py-0.5">
            Changelog
          </span>
        </div>
        <div className="gsap-changelog-heading">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-0 leading-[0.9] uppercase text-[#121212]">
            Developer
          </h2>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-[0.9] uppercase text-[#D02020]">
            Ngapain Aja Sih
          </h2>
          <p className="text-[#555555] font-medium mb-10">
            Ini sih yang dikerjain
          </p>
        </div>

        <div className="gsap-changelog-body border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white p-8">
          <Timeline orientation="vertical">
            {changelogHistories.map((item, idx) => (
              <TimelineItem
                key={idx}
                variant={idx === 0 ? "default" : "outline"}
              >
                <TimelineItemDate>{item.date}</TimelineItemDate>
                <TimelineItemTitle>{item.title}</TimelineItemTitle>
                {item.changes.map((change, cIdx) => (
                  <TimelineItemDescription className="mb-2" key={cIdx}>
                    {change}
                  </TimelineItemDescription>
                ))}
              </TimelineItem>
            ))}
          </Timeline>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 bg-[#121212] border-t-4 border-[#121212]">
        <div className="w-full flex">
          <div className="flex-1 h-3 bg-[#D02020]" />
          <div className="flex-1 h-3 bg-[#1040C0]" />
          <div className="flex-1 h-3 bg-[#F0C020]" />
        </div>
        <div className="gsap-footer-content max-w-7xl mx-auto px-6 py-16 flex flex-col items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#D02020] border-2 border-white flex items-center justify-center">
              <CalendarSync className="text-white w-4 h-4" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white">
              KeRaS.
            </span>
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight text-white max-w-md text-center">
            KRS-an jadi lebih tenang, kelas incaran pun aman.
          </h3>
          <a href="https://github.com/dendik-creation/keras/" target="_blank">
            <Button
              variant="ghost"
              className="text-[#888] hover:text-[#F0C020] hover:bg-transparent gap-2 uppercase font-bold tracking-wider border-2 border-[#555] hover:border-[#F0C020] transition-colors rounded-none"
            >
              <Github className="w-4 h-4" /> Kontribusi
            </Button>
          </a>
          <div className="w-full h-px bg-[#333]" />
          <div className="w-full flex flex-col items-center gap-2">
            <small
              className="text-sm text-[#666] font-medium text-center leading-tight"
              id="note-1"
            >
              1. Peningkatan peluang bergantung pada performa sistem dari situs
              resmi universitas.
            </small>
            <small
              className="text-sm text-[#666] font-medium text-center leading-tight"
              id="note-2"
            >
              2. Trigger manual dari mahasiswa untuk mendapatkan jadwal terbaru.
            </small>
          </div>
        </div>
      </footer>
    </div>
  );
}
