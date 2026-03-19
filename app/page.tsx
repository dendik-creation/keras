import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  Github,
  EyeOff,
  LayoutDashboard,
  ArrowRight,
  Lock,
  Swords,
  TextSearch,
  CalendarSync,
} from "lucide-react";
import Link from "next/link";
import RotatingText from "@/components/RotatingText";
import ElectricBorder from "@/components/ElectricBorder";
import changelogHistories from "@/lib/changelog";
import Timeline, {
  TimelineItem,
  TimelineItemDate,
  TimelineItemTitle,
  TimelineItemDescription,
} from "@/components/ui/timeline";
import ShapeGrid from "@/components/ShapeGrid";
import Lightning from "@/components/Lightning";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#FCFCFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden font-sans">
      <nav className="relative z-10 flex justify-between items-center px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <CalendarSync className="text-violet-900" />
          <span className="text-xl font-bold tracking-tighter text-violet-900">
            KeRaS.
          </span>
        </div>
        <div className="hidden md:flex gap-10 text-sm font-bold text-slate-800">
          <a
            href="#features"
            className="hover:text-violet-700 transition-colors"
          >
            Fitur
          </a>
          <a
            href="#security"
            className="hover:text-violet-700 transition-colors"
          >
            Keamanan
          </a>
          <a
            href="#changelog"
            className="hover:text-violet-700 transition-colors"
          >
            Changelog
          </a>
        </div>
        <a href="https://github.com/dendik-creation/keras/" target="_blank">
          <Button
            variant="outline"
            className="rounded-full border-violet-400 bg-white hover:bg-violet-500 hover:border-white hover:text-white shadow-sm transition-all"
          >
            <Github className="w-4 h-4 mr-2" /> dendik-creation
          </Button>
        </a>
      </nav>

      <div className="absolute inset-0 z-0">
        <ShapeGrid
          speed={0.2}
          squareSize={60}
          direction="down"
          borderColor="#2563eb40"
          hoverFillColor="#2563eb"
          shape="hexagon"
        />
      </div>

      {/* 1. HERO SECTION */}
      <section className="relative z-10 px-6 pt-20 pb-32 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-8xl font-extrabold tracking-tight mb-8 leading-[0.95] text-slate-900">
          Susun Jadwal <br />
          <div className="flex justify-center items-center">
            <RotatingText
              texts={["Tanpa Ribet", "Tanpa Drama", "Pasti Mudah"]}
              mainClassName="px-2 sm:px-2 md:px-3 text-indigo-600 overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
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
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-normal">
          Untuk kamu yang selalu kesusahan mengatur jadwal mata kuliahmu.{" "}
          <span className="text-slate-900 font-semibold">KeRaS</span> hadir
          sebagai solusi untukmu
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href={"/login"}>
            <Button
              size="lg"
              variant="outline"
              className="bg-white hover:bg-blue-600 hover:text-white font-semibold px-10 h-14 text-lg rounded-2xl shadow-lg shadow-blue-200 border-blue-600"
            >
              Mulai Sekarang <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <section
        id="features"
        className="relative z-10 px-6 py-24 max-w-7xl mx-auto"
      >
        <div className="grid md:grid-cols-12 gap-6">
          {/* Main Feature - Unified View */}
          <Card className="md:col-span-7 bg-white border-slate-200/60 shadow-xl shadow-slate-100/50 overflow-hidden group">
            <CardContent className="p-10">
              <LayoutDashboard className="w-10 h-10 text-blue-600 mb-6" />
              <h3 className="text-3xl font-bold text-slate-900 mb-3">
                Unified View
              </h3>
              <p className="text-slate-500 mb-10 leading-relaxed">
                Lihat semua jadwal mata kuliah yang tersedia dalam satu tampilan
                terpadu. Tidak perlu bolak-balik cek detail kelas, semua
                informasi ada di depan mata.
              </p>
            </CardContent>
          </Card>

          {/* Perang KRS - Action Box */}
          <div className={"md:col-span-5 h-full flex relative"}>
            <div className="absolute z-10 w-full h-full">
              <Lightning
                hue={70}
                xOffset={0}
                speed={1}
                intensity={1}
                size={1}
              />
            </div>
            <Card className="bg-slate-900 h-full border-none overflow-hidden text-white relative group flex flex-col">
              <CardContent className="p-10 flex flex-col h-full justify-between flex-1">
                <div className="flex flex-col flex-1">
                  <iframe
                    src="https://lottie.host/embed/a39f5331-c6ad-4a20-80ec-323c1710060f/D3eSmSX0sN.lottie"
                    className="w-20 h-20 z-20"
                  ></iframe>
                  <h3 className="text-3xl z-20 font-bold mb-3 tracking-tight">
                    Perang KRS
                  </h3>
                  <p className="text-slate-400 z-20 leading-snug">
                    Cukup dengan satu klik, Jadwal yang kamu siapkan akan
                    terkirim dengan cepat ke sistem universitas tanpa klik
                    satu-satu kembali.{" "}
                    <sup>
                      <a href="#note-1">1</a>
                    </sup>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Zero Database - Privacy */}
          <Card className="md:col-span-5 bg-slate-900 border-none overflow-hidden text-white relative group">
            <CardContent className="p-10 flex flex-col h-full justify-between">
              <div>
                <ShieldCheck className="w-12 h-12 mb-6 text-blue-400 transition-transform" />
                <h3 className="text-3xl font-bold mb-3 tracking-tight">
                  Zero Database
                </h3>
                <p className="text-slate-400 leading-snug">
                  Kami tidak menyimpan data pribadimu. Semua informasi diproses
                  secara temporer untuk menjaga privasimu tetap aman.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Main Feature - Unified View */}
          <Card className="md:col-span-7 bg-white border-slate-200/60 shadow-xl shadow-slate-100/50 overflow-hidden group">
            <CardContent className="p-10">
              <TextSearch className="w-10 h-10 text-blue-600 mb-6" />
              <h3 className="text-3xl font-bold text-slate-900 mb-3">
                Realtime Scrapping
              </h3>
              <p className="text-slate-500 mb-10 leading-relaxed">
                Data jadwal mata kuliah diambil secara real-time dari situs
                resmi universitasmu. Pastikan kamu mendapatkan informasi paling
                akurat dan terbaru tanpa perlu khawatir tentang data tertinggal.{" "}
                <sup>
                  <a href="#note-2">2</a>
                </sup>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. SECURITY SECTION (TRUST) */}
      <section
        id="security"
        className="relative z-10 px-6 py-28 bg-slate-50/50 border-y border-slate-100"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold mb-16 text-slate-900">
            Keamanan Tanpa Kompromi
          </h2>
          <div className="grid md:grid-cols-2 gap-16 text-left">
            <div className="flex gap-5">
              <div className="shrink-0 w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                <EyeOff className="text-slate-400 w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-slate-900 mb-2">Invisible Log</h5>
                <p className="text-slate-500 text-sm leading-relaxed text-pretty">
                  KeRaS tidak merekam aktivitasmu. Setiap interaksi bersifat
                  sementara dan langsung dihapus saat sesi berakhir.
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="shrink-0 w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                <Lock className="text-slate-400 w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-slate-900 mb-2">
                  Server-side Bridging
                </h5>
                <p className="text-slate-500 text-sm leading-relaxed text-pretty">
                  Kami memanfaatkan sesi kamu sebagai jembatan aman antara KeRaS
                  dan sistem entri krs universitas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CHANGELOG SECTION */}
      <section
        id="changelog"
        className="relative z-10 px-6 py-28 max-w-7xl mx-auto"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
              Changelog
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Ringkasan rilis dan perubahan penting pada KeRaS dari waktu ke
              waktu.
            </p>
          </div>

          <div className="space-y-4">
            <Timeline orientation="vertical">
              {changelogHistories.map((item, idx) => (
                <TimelineItem
                  key={idx}
                  variant={idx == 0 ? "default" : "outline"}
                >
                  <TimelineItemDate>{item.date}</TimelineItemDate>
                  <TimelineItemTitle>{item.title}</TimelineItemTitle>
                  {item.changes.map((change, idx) => (
                    <TimelineItemDescription className="mb-2" key={idx}>
                      {change}
                    </TimelineItemDescription>
                  ))}
                </TimelineItem>
              ))}
            </Timeline>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="relative z-10 px-6 py-16 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
          <div className="flex items-center gap-2">
            <CalendarSync className="text-violet-900" />
            <span className="text-sm font-bold tracking-tighter text-violet-900">
              KeRaS.
            </span>
          </div>
          <h3 className="text-2xl font-bold max-w-md">
            KRS-an jadi lebih tenang, kelas incaran pun aman.
          </h3>
          <a href="https://github.com/dendik-creation/keras/" target="_blank">
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-slate-900 gap-2"
            >
              <Github className="w-4 h-4" /> Kontribusi di GitHub
            </Button>
          </a>
          <div className="w-full h-px bg-slate-100 my-4" />
          <footer className="mt-4 w-full flex flex-col items-center gap-2">
            <small
              className="text-sm text-slate-400 font-medium text-center leading-tight"
              id="note-1"
            >
              1. Peningkatan peluang bergantung pada performa sistem dari situs
              resmi universitas.
            </small>
            <small
              className="text-sm text-slate-400 font-medium text-center leading-tight"
              id="note-2"
            >
              2. Trigger manual dari mahasiswa untuk mendapatkan jadwal terbaru.
            </small>
          </footer>
        </div>
      </footer>
    </div>
  );
}
