import { Button } from "@/components/ui/button";
import { CalendarSync } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analitik — KeRaS",
  description: "Statistik penggunaan KeRaS secara anonim",
};

const DASHBOARD_EMBED_URL =
  "https://us.posthog.com/embedded/OA-Z6jHQMwj5TuPGnBXY-tDu1siZzA";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-[#F0F0F0] text-[#121212] font-sans overflow-x-hidden">
      {/* Top color band */}
      <div className="w-full flex">
        <div className="flex-1 h-3 bg-[#D02020]" />
        <div className="flex-1 h-3 bg-[#1040C0]" />
        <div className="flex-1 h-3 bg-[#F0C020]" />
      </div>

      {/* NAV */}
      <nav className="relative z-20 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b-4 border-[#121212]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#D02020] flex items-center justify-center border-2 border-[#121212]">
            <CalendarSync className="text-white w-4 h-4" />
          </div>
          <span className="text-xl font-black tracking-tighter text-[#121212]">
            KeRaS.
          </span>
        </Link>
        <Link href="/">
          <Button
            variant="outline"
            className="rounded-none border-2 border-[#121212] bg-[#F0C020] text-[#121212] hover:bg-[#121212] hover:text-[#F0C020] shadow-[4px_4px_0px_0px_#121212] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none uppercase font-bold tracking-wider transition-all"
          >
            ← Beranda
          </Button>
        </Link>
      </nav>

      {/* HEADER */}
      <section className="px-6 pt-12 pb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-8 h-1 bg-[#1040C0]" />
          <span className="text-xs font-black uppercase tracking-widest text-[#1040C0]">
            Analitik
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-[0.9] uppercase text-[#121212]">
          Data <span className="text-[#D02020]">Penggunaan</span>
        </h1>
        <p className="text-[#555555] font-medium max-w-2xl leading-relaxed">
          Statistik penggunaan KeRaS yang dikumpulkan secara anonim. Identitas
          mahasiswa (NIM) selalu disamarkan dan tidak ada data pribadi yang
          disimpan.
        </p>
      </section>

      {/* DASHBOARD EMBED */}
      <section className="px-6 pb-24 max-w-7xl mx-auto">
        <div className="border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white">
          {/* Card header bar */}
          <div className="flex items-center gap-3 border-b-4 border-[#121212] bg-[#121212] px-4 py-3">
            <div className="w-8 h-8 bg-[#D02020] flex items-center justify-center border-2 border-[#121212]">
              <CalendarSync className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-white">
              KeRaS Analytics
            </span>
          </div>

          <div className="">
            <iframe
              title="KeRaS Analytics Dashboard"
              src={DASHBOARD_EMBED_URL}
              width="100%"
              height={1400}
              frameBorder="0"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups"
              className="w-full block border-2 border-[#121212]"
            />
          </div>
        </div>
      </section>

      {/* Bottom color band */}
      <div className="w-full flex">
        <div className="flex-1 h-3 bg-[#F0C020]" />
        <div className="flex-1 h-3 bg-[#1040C0]" />
        <div className="flex-1 h-3 bg-[#D02020]" />
      </div>
    </div>
  );
}
