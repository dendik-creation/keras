"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Github,
  ChartPie,
  LayoutDashboard,
  ArrowRight,
  TextSearch,
  Swords,
  Server,
  Plus,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import RotatingText from "@/components/RotatingText";
import InstallPWAButton from "@/components/custom/InstallPWAButton";
import GithubStarButton from "@/components/custom/GithubStarButton";
import changelogHistories from "@/lib/changelog";
import Timeline, {
  TimelineItem,
  TimelineItemDate,
  TimelineItemTitle,
  TimelineItemDescription,
} from "@/components/ui/timeline";

gsap.registerPlugin(ScrollTrigger);

// ─── Swiss Section Label ──────────────────────────────────────────────────────
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

export default function Page() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reveal = (
        selector: string,
        trigger: string = selector,
        stagger: number = 0,
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
            scrollTrigger: { trigger, start: "top 85%" },
          },
        );
      };

      reveal(".gsap-nav");
      reveal(".gsap-hero-label");
      reveal(".gsap-headline-line", ".gsap-headline-line", 0.08);
      reveal(".gsap-hero-sub");
      reveal(".gsap-cta-btn");
      reveal(".gsap-hero-composition");

      reveal(".gsap-features-label", "#features");
      reveal(".gsap-features-heading", "#features");
      reveal(".gsap-feat-card", ".gsap-feat-grid", 0.08);

      reveal(".gsap-security-label", "#security");
      reveal(".gsap-security-heading", "#security");
      reveal(".gsap-security-card", ".gsap-security-grid", 0.08);

      reveal(".gsap-changelog-label", "#changelog");
      reveal(".gsap-changelog-heading", "#changelog");
      reveal(".gsap-changelog-body", "#changelog");

      reveal(".gsap-footer-content", "footer");

      // Precise, mechanical geometry loops
      gsap.to(".swiss-rotate", {
        rotation: 360,
        duration: 24,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
      gsap.to(".swiss-rotate-rev", {
        rotation: -360,
        duration: 30,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-white text-black selection:bg-[#FF3000] selection:text-white overflow-x-hidden font-sans"
    >
      {/* ─── NAV ─── */}
      <nav className="gsap-nav opacity-0 relative z-20 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b-2 border-black">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="KeRaS"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
            priority
          />
          <span className="text-xl font-black tracking-tighter text-black">
            KeRaS.
          </span>
        </div>
        <div className="hidden md:flex gap-10 text-xs font-bold text-black uppercase tracking-widest">
          <a
            href="#features"
            className="hover:text-[#FF3000] transition-colors duration-200"
          >
            Fitur
          </a>
          <a
            href="#security"
            className="hover:text-[#FF3000] transition-colors duration-200"
          >
            Keamanan
          </a>
          <a
            href="#changelog"
            className="hover:text-[#FF3000] transition-colors duration-200"
          >
            Changelog
          </a>
          <Link
            href="/analytics"
            className="hover:text-[#FF3000] transition-colors duration-200"
          >
            Analitik
          </Link>
        </div>
        <GithubStarButton />
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative z-10 border-b-2 border-black">
        <div className="grid lg:grid-cols-12 max-w-7xl mx-auto">
          {/* Left: Headline block (7 cols) */}
          <div className="lg:col-span-7 px-6 pt-16 pb-20 lg:border-r-2 border-black">
            <div className="gsap-hero-label opacity-0 mb-8">
              <SectionLabel index="00" label="Versi 2 Kayaknya" />
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] uppercase text-black">
              <div className="gsap-headline-line opacity-0">Adios</div>
              <div className="gsap-headline-line opacity-0 flex items-center mt-1">
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
              </div>
            </h1>

            <p className="gsap-hero-sub opacity-0 text-base md:text-lg text-[#555555] max-w-xl mt-8 mb-10 leading-relaxed font-medium">
              Untuk kamu yang selalu kesusahan mengatur jadwal mata kuliahmu.{" "}
              <span className="text-black font-black">KeRaS</span> hadir sebagai
              solusi objektif, cepat, jelas, tanpa drama.
            </p>

            <div className="gsap-cta-btn opacity-0 w-full lg:w-fit">
              <div className="flex flex-col sm:flex-row gap-0 border-2 border-black">
                <Link href="/login">
                  <Button className="rounded-none w-full bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest h-16 px-10 text-base transition-colors duration-200 border-0">
                    Aku Nak Coba <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/analytics">
                  <Button className="rounded-none bg-white text-black hover:bg-black hover:text-white uppercase font-black tracking-widest h-16 px-10 text-base transition-colors duration-200 border-0 sm:border-l-2 border-t-2 sm:border-t-0 border-black w-full sm:w-auto">
                    Lihat Analitik
                  </Button>
                </Link>
              </div>
              <InstallPWAButton className="w-full" />
            </div>
          </div>

          {/* Right: Geometric composition (5 cols) */}
          <div className="gsap-hero-composition opacity-0 lg:col-span-5 relative min-h-[320px] lg:min-h-full swiss-grid-pattern overflow-hidden">
            {/* Red square */}
            <div className="absolute top-12 left-12 w-32 h-32 bg-[#FF3000]" />
            {/* Black rectangle */}
            <div className="absolute bottom-16 right-14 w-40 h-24 bg-black" />
            {/* Outline circle (rotating marker) */}
            <div className="swiss-rotate absolute top-24 right-16 w-28 h-28 border-2 border-black rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-[#FF3000] rounded-full absolute top-1" />
            </div>
            {/* Small solid black circle */}
            <div className="absolute bottom-24 left-20 w-12 h-12 bg-black rounded-full" />
            {/* Diagonal line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-black/80" />
            {/* Rotating plus */}
            <div className="swiss-rotate-rev absolute bottom-12 left-1/2 text-[#FF3000]">
              <Plus className="w-10 h-10" strokeWidth={3} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 01. FEATURES ─── */}
      <section
        id="features"
        className="relative z-10 px-6 py-20 md:py-28 max-w-7xl mx-auto"
      >
        <div className="gsap-features-label opacity-0 mb-4">
          <SectionLabel index="01" label="Fitur Utama" />
        </div>
        <h2 className="gsap-features-heading opacity-0 text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-14 leading-[0.85] uppercase text-black">
          Apa Saja <br />
          <span className="text-[#FF3000]">Keahliannya</span>
        </h2>

        <div className="gsap-feat-grid grid md:grid-cols-12 border-2 border-black">
          {/* Unified View */}
          <article className="gsap-feat-card opacity-0 md:col-span-7 bg-white md:border-r-2 border-b-2 md:border-b-0 border-black p-8 md:p-12 group hover:bg-[#FF3000] transition-colors duration-200">
            <div className="flex items-start justify-between mb-8">
              <div className="w-14 h-14 border-2 border-black flex items-center justify-center group-hover:border-white transition-colors duration-200">
                <LayoutDashboard className="w-7 h-7 text-black group-hover:text-white transition-colors duration-200" />
              </div>
              <span className="text-xs font-black tracking-widest text-[#FF3000] group-hover:text-white transition-colors duration-200">
                01
              </span>
            </div>
            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black group-hover:text-white mb-3 transition-colors duration-200">
              Unified View
            </h3>
            <p className="text-[#555555] group-hover:text-white/90 leading-relaxed font-medium max-w-md transition-colors duration-200">
              Lihat semua jadwal mata kuliah yang tersedia dalam satu tampilan
              terpadu. Tidak perlu bolak-balik cek detail kelas, semua informasi
              ada di depan mata.
            </p>
          </article>

          {/* Perang KRS */}
          <article className="gsap-feat-card opacity-0 md:col-span-5 bg-black p-8 md:p-12 group hover:bg-[#FF3000] transition-colors duration-200 border-b-2 md:border-b-0 border-black">
            <div className="flex items-start justify-between mb-8">
              <div className="w-14 h-14 border-2 border-white flex items-center justify-center">
                <Swords className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-black tracking-widest text-[#FF3000] group-hover:text-white transition-colors duration-200">
                02
              </span>
            </div>
            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-3">
              Perang KRS
            </h3>
            <p className="text-white/70 group-hover:text-white leading-snug font-medium transition-colors duration-200">
              Cukup satu klik, jadwal yang kamu siapkan terkirim cepat ke sistem
              universitas tanpa klik satu-satu.{" "}
              <sup>
                <a
                  href="#note-1"
                  className="text-[#FF3000] group-hover:text-white hover:underline font-bold"
                >
                  1
                </a>
              </sup>
            </p>
          </article>

          {/* Zero Database */}
          <article className="gsap-feat-card opacity-0 md:col-span-5 bg-[#F2F2F2] swiss-dots md:border-r-2 border-t-2 border-black p-8 md:p-12 group hover:bg-black transition-colors duration-200">
            <div className="flex items-start justify-between mb-8">
              <div className="w-14 h-14 border-2 border-black group-hover:border-white flex items-center justify-center transition-colors duration-200">
                <ShieldCheck className="w-7 h-7 text-black group-hover:text-white transition-colors duration-200" />
              </div>
              <span className="text-xs font-black tracking-widest text-[#FF3000]">
                03
              </span>
            </div>
            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black group-hover:text-white mb-3 transition-colors duration-200">
              Zero Database
            </h3>
            <p className="text-[#555555] group-hover:text-white/80 leading-snug font-medium transition-colors duration-200">
              Kami tidak menyimpan data pribadimu. Semua informasi diproses
              secara temporer untuk menjaga privasimu tetap aman.
            </p>
          </article>

          {/* Realtime Scrapping */}
          <article className="gsap-feat-card opacity-0 md:col-span-7 bg-white border-t-2 border-black p-8 md:p-12 group hover:bg-[#FF3000] transition-colors duration-200">
            <div className="flex items-start justify-between mb-8">
              <div className="w-14 h-14 border-2 border-black group-hover:border-white flex items-center justify-center transition-colors duration-200">
                <TextSearch className="w-7 h-7 text-black group-hover:text-white transition-colors duration-200" />
              </div>
              <span className="text-xs font-black tracking-widest text-[#FF3000] group-hover:text-white transition-colors duration-200">
                04
              </span>
            </div>
            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black group-hover:text-white mb-3 transition-colors duration-200">
              Realtime Scrapping
            </h3>
            <p className="text-[#555555] group-hover:text-white/90 leading-relaxed font-medium max-w-md transition-colors duration-200">
              List jadwal mata kuliah yang kamu dapatkan selalu terbaru untuk
              memastikan kamu tidak tertinggal ingpo.{" "}
              <sup>
                <a
                  href="#note-2"
                  className="text-[#FF3000] group-hover:text-white font-bold"
                >
                  2
                </a>
              </sup>
            </p>
          </article>
        </div>
      </section>

      {/* ─── 02. SECURITY ─── */}
      <section
        id="security"
        className="relative z-10 border-t-2 border-black bg-[#F2F2F2] swiss-grid-pattern"
      >
        <div className="px-6 py-20 md:py-28 max-w-7xl mx-auto">
          <div className="gsap-security-label opacity-0 mb-4">
            <SectionLabel index="02" label="Keamanan" />
          </div>
          <h2 className="gsap-security-heading opacity-0 text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-14 leading-[0.85] uppercase text-black">
            Nasib Datamu <span className="text-[#FF3000]">Bagaimana?</span>
          </h2>

          <div className="gsap-security-grid grid md:grid-cols-12 border-2 border-black bg-white">
            <div className="gsap-security-card opacity-0 md:col-span-5 bg-black md:border-r-2 border-b-2 md:border-b-0 border-black p-8 md:p-12 group">
              <div className="w-14 h-14 border-2 border-[#FF3000] flex items-center justify-center mb-8">
                <ChartPie className="w-7 h-7 text-[#FF3000]" />
              </div>
              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-3">
                Analitik Anonim
              </h3>
              <p className="text-white/70 leading-snug font-medium">
                Kami mengumpulkan statistik penggunaan secara anonim. NIM-mu
                selalu disamarkan dan tidak ada data pribadi yang disimpan.
              </p>
            </div>
            <div className="gsap-security-card opacity-0 md:col-span-7 bg-white p-8 md:p-12">
              <div className="w-14 h-14 border-2 border-black flex items-center justify-center mb-8">
                <Server className="w-7 h-7 text-black" />
              </div>
              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black mb-3">
                Just Accessing
              </h3>
              <p className="text-[#555555] leading-relaxed font-medium max-w-md">
                <strong className="text-black">KeRaS</strong> menggunakan sesi
                login kamu untuk akses situs resmi KRS universitas sebagai
                jembatan konten mata kuliah untuk jadwalmu. Udah itu aja.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 03. CHANGELOG ─── */}
      <section
        id="changelog"
        className="relative z-10 border-t-2 border-black px-6 py-20 md:py-28 max-w-7xl mx-auto"
      >
        <div className="gsap-changelog-label opacity-0 mb-4">
          <SectionLabel index="03" label="Changelog" />
        </div>
        <div className="gsap-changelog-heading opacity-0">
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] uppercase text-black">
            Developer
          </h2>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-[0.85] uppercase text-[#FF3000]">
            Ngapain Aja Sih
          </h2>
          <p className="text-[#555555] font-medium mb-10">
            Ini sih yang dikerjain
          </p>
        </div>

        <div className="gsap-changelog-body opacity-0 border-2 border-black bg-white p-6 md:p-8">
          <div className="overflow-x-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="min-w-[800px]">
              <Timeline orientation="horizontal">
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
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 bg-black border-t-2 border-black">
        <div className="gsap-footer-content opacity-0 max-w-7xl mx-auto px-6 py-16 flex flex-col items-start gap-8">
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
          <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white max-w-2xl leading-[0.9]">
            KRS-an jadi lebih tenang, kelas incaran pun{" "}
            <span className="text-[#FF3000]">aman.</span>
          </h3>
          <a href="https://github.com/dendik-creation/keras/" target="_blank">
            <Button
              variant="outline"
              className="rounded-none border-2 border-white bg-transparent text-white hover:bg-[#FF3000] hover:border-[#FF3000] gap-2 uppercase font-bold tracking-widest transition-colors duration-200"
            >
              <Github className="w-4 h-4" /> Kontribusi
            </Button>
          </a>
          <div className="w-full h-0.5 bg-white/20" />
          <div className="w-full flex flex-col items-start gap-2">
            <small
              className="text-sm text-white/50 font-medium leading-tight"
              id="note-1"
            >
              1. Peningkatan peluang bergantung pada performa sistem dari situs
              resmi universitas.
            </small>
            <small
              className="text-sm text-white/50 font-medium leading-tight"
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
