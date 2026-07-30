import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analitik — KeRaS",
  description: "Statistik penggunaan KeRaS secara anonim",
};

const DASHBOARD_EMBED_URL =
  "https://us.posthog.com/embedded/OA-Z6jHQMwj5TuPGnBXY-tDu1siZzA";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] font-sans overflow-x-hidden selection:bg-[#FF3000] selection:text-white">
      {/* Top accent band */}
      <div className="w-full h-2 bg-[#FF3000]" />

      {/* NAV */}
      <nav className="relative z-20 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b-2 border-[#111111]">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="KeRaS"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
            priority
          />
          <span className="text-xl font-black tracking-tighter text-[#111111]">
            KeRaS.
          </span>
        </Link>
        <Link href="/">
          <Button
            variant="outline"
            className="rounded-none border-2 border-[#111111] bg-transparent text-[#111111] hover:bg-[#FF3000] hover:text-white hover:border-[#FF3000] uppercase font-bold tracking-widest transition-colors duration-200"
          >
            ← Beranda
          </Button>
        </Link>
      </nav>

      {/* HEADER */}
      <section className="px-6 pt-16 pb-12 max-w-7xl mx-auto">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-[0.85] uppercase text-[#111111]">
          Data<br />Penggunaan
        </h1>
        <p className="text-[#555555] font-medium max-w-2xl leading-relaxed text-lg md:text-xl">
          Statistik penggunaan KeRaS yang dikumpulkan secara anonim. Identitas
          mahasiswa (NIM) selalu disamarkan dan tidak ada data pribadi yang
          disimpan.
        </p>
      </section>

      <div className="w-full h-0.5 bg-[#111111]" aria-hidden="true" />

      {/* DASHBOARD EMBED */}
      <main className="py-12 lg:py-20">
        <section className="px-6 pb-24 max-w-[1600px] mx-auto">
          <div className="border-2 border-[#111111] bg-white">
            <div className="">
              <iframe
                title="KeRaS Analytics Dashboard"
                src={DASHBOARD_EMBED_URL}
                width="100%"
                height={2000}
                frameBorder="0"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="w-full block border-2 border-[#111111]"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Bottom accent band */}
      <div className="w-full h-2 bg-[#FF3000]" />
    </div>
  );
}
