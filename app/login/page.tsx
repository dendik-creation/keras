"use client";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BadgeCheck, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { gooeyToast } from "@/components/ui/goey-toaster";
import axios from "axios";
import { setLocalStorage } from "@/helper/local_storage";
import { trackLogin } from "@/lib/analytics/events";
import GuestAccess from "@/components/middleware_wrapper/GuestAccess";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import SiteOffGuard from "@/components/middleware_wrapper/SiteOffGuard";

export default function Page() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isDisclaimerAccepted, setIsDisclaimerAccepted] = useState(true);
  const router = useRouter();

  const handleDisclaimerChange = (value: boolean) => {
    setIsDisclaimerAccepted(value);
    setLocalStorage("disclaimer_accepted", value);
  };

  useEffect(() => {
    const accepted = localStorage.getItem("disclaimer_accepted") === "true";
    setIsDisclaimerAccepted(accepted);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post("/api/login", form, {
        headers: { "Content-Type": "application/json" },
      });
      if (response.data?.error === true) {
        if (response.data?.reason === "questionnaire_required") {
          const questionnaireUrl = response.data?.questionnaireUrl as string;
          gooeyToast.warning("Isi Kuesioner Dulu Wok", {
            description:
              "Kampus wajibkan pengisian kuesioner kepuasan mahasiswa semester ini sebelum bisa akses KRS.",
            action: {
              label: "Isi Kuesioner",
              onClick: () => window.open(questionnaireUrl, "_blank"),
            },
          });
          return;
        }
        gooeyToast.error("Login Gagal", {
          description: response.data?.message,
        });
        return;
      }
      const data = response.data;
      if (data?.user) {
        setLocalStorage("active_user", data.user);
        void trackLogin(data.user);
      }
      // Honor a callbackUrl (e.g. adopting a shared schedule) when it's a safe
      // internal path; otherwise fall back to the schedule page.
      const callbackUrl = new URLSearchParams(window.location.search).get(
        "callbackUrl",
      );
      const safeCallback =
        callbackUrl &&
        callbackUrl.startsWith("/") &&
        !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/schedule";
      router.push(safeCallback);
    } catch (error: any) {
      gooeyToast.error("Terjadi Kesalahan", {
        description: error?.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SiteOffGuard>
      <GuestAccess>
        {/* ── Disclaimer Dialog ── */}
        <Dialog open={!isDisclaimerAccepted}>
          <DialogContent className="rounded-none border-2 border-black bg-white max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src="/logo.png"
                  alt="KeRaS"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain flex-shrink-0"
                />
                <DialogTitle className="font-black uppercase tracking-tight text-black">
                  Hanya Untuk Universitas Muria Kudus
                </DialogTitle>
              </div>
              <div className="w-full h-0.5 bg-[#FF3000]" />
              <DialogDescription className="text-[#555555] leading-relaxed pt-3 font-medium">
                KeRaS adalah alat bantu untuk mempercepat proses pengisian KRS.
                Penggunaan sistem ini sepenuhnya menjadi tanggung jawab
                pengguna. Selalu periksa kembali jadwal KRS yang telah diisi
                sebelum mengirimkannya ke sistem resmi universitas. Kami tidak
                bertanggung jawab atas kesalahan atau masalah yang mungkin
                terjadi akibat penggunaan KeRaS.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  onClick={() => handleDisclaimerChange(true)}
                  className="rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest transition-colors duration-200"
                >
                  <BadgeCheck className="w-4 h-4 mr-2" />
                  Saya Paham
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Main Layout ── */}
        <div className="grid min-h-svh lg:grid-cols-12 bg-white">
          {/* Left: Form Panel (7 cols) */}
          <div className="lg:col-span-7 flex flex-col p-0 lg:border-r-2 border-black">
            {/* Top accent band */}
            <div className="w-full h-2 bg-[#FF3000]" />

            <div className="flex flex-col flex-1 p-8 md:p-12">
              {/* Brand */}
              <Link href="/" className="flex items-center gap-3 w-fit mb-auto">
                <Image
                  src="/logo.png"
                  alt="KeRaS"
                  width={36}
                  height={36}
                  className="w-9 h-9 object-contain"
                  priority
                />
                <div className="flex flex-col">
                  <span className="font-black tracking-tighter text-black text-lg leading-none">
                    KeRaS
                  </span>
                  <span className="text-xs font-medium text-[#555555] leading-none mt-0.5">
                    Buat Jadwal KRS-mu lebih cepat
                  </span>
                </div>
              </Link>

              {/* Form */}
              <div className="flex flex-1 items-center py-12">
                <div className="w-full max-w-md">
                  {/* Section label */}
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-[#FF3000] font-black text-sm tracking-widest">
                      00
                    </span>
                    <div className="w-8 h-0.5 bg-[#FF3000]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-black">
                      Autentikasi
                    </span>
                  </div>

                  {/* Form heading */}
                  <div className="mb-10">
                    <h1 className="text-5xl md:text-6xl mb-3 font-black uppercase tracking-tighter text-black leading-[0.85]">
                      Login <span className="text-[#FF3000]">Dulu Wok</span>
                    </h1>
                    <p className="text-[#555555] text-sm font-medium leading-snug">
                      Masukkan Username dan Password kamu{" "}
                      <span className="text-black font-bold">
                        (sama seperti kanal)
                      </span>
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <FieldGroup>
                      {/* Username */}
                      <Field>
                        <FieldLabel
                          htmlFor="username"
                          className="text-xs font-black uppercase tracking-widest text-black mb-1"
                        >
                          Username
                        </FieldLabel>
                        <Input
                          disabled={isLoading}
                          id="username"
                          type="text"
                          autoFocus
                          placeholder="Username"
                          required
                          onChange={handleChange}
                          value={form.username}
                          className="rounded-none border-0 border-b-2 border-black bg-transparent px-0 focus:border-[#FF3000] focus-visible:ring-0 font-medium h-12 text-lg transition-colors duration-200"
                        />
                      </Field>

                      {/* Password */}
                      <Field>
                        <FieldLabel
                          htmlFor="password"
                          className="text-xs font-black uppercase tracking-widest text-black mb-1"
                        >
                          Password
                        </FieldLabel>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          required
                          onChange={handleChange}
                          value={form.password}
                          className="rounded-none border-0 border-b-2 border-black bg-transparent px-0 focus:border-[#FF3000] focus-visible:ring-0 font-medium h-12 text-lg transition-colors duration-200"
                        />
                      </Field>

                      {/* Submit */}
                      <Field>
                        <Button
                          disabled={isLoading}
                          type="submit"
                          className="w-full rounded-none bg-black text-white hover:bg-[#FF3000] uppercase font-black tracking-widest h-16 text-base transition-colors duration-200 mt-2"
                        >
                          {isLoading ? (
                            <Loader2 className="animate-spin w-5 h-5" />
                          ) : (
                            <span>Masuk Sekarang</span>
                          )}
                        </Button>
                      </Field>

                      {/* Disclaimer notice */}
                      <Field>
                        <div className="border-l-2 border-[#FF3000] pl-3 py-1">
                          <span className="text-xs text-[#555555] font-medium leading-snug">
                            Tidak dirancang untuk berpindah-pindah akun
                          </span>
                        </div>
                      </Field>
                    </FieldGroup>
                  </form>
                </div>
              </div>

              {/* Back to home */}
              <Link
                href="/"
                className="text-xs font-bold uppercase tracking-widest text-[#555555] hover:text-[#FF3000] transition-colors duration-200 w-fit"
              >
                ← Kembali ke Beranda
              </Link>
            </div>
          </div>

          {/* Right: Swiss Geometric Panel (5 cols) */}
          <div className="hidden lg:block lg:col-span-5 bg-black relative overflow-hidden swiss-grid-pattern">
            {/* Red square */}
            <div className="absolute top-16 left-16 w-44 h-44 bg-[#FF3000]" />
            {/* Outline square */}
            <div className="absolute top-28 left-28 w-44 h-44 border-2 border-white/40" />
            {/* White circle outline */}
            <div className="absolute bottom-28 right-16 w-40 h-40 border-2 border-white/60 rounded-full" />
            {/* Solid red circle */}
            <div className="absolute bottom-36 right-28 w-16 h-16 bg-[#FF3000] rounded-full" />
            {/* Horizontal rule */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/20" />
            {/* Vertical rule */}
            <div className="absolute top-0 left-1/2 h-full w-0.5 bg-white/20" />
            {/* Wordmark */}
            <div className="absolute bottom-25 left-10">
              <span className="text-white/90 font-black tracking-tighter text-5xl leading-none">
                Sudah KeRaS<span className="text-[#FF3000]">.</span>
              </span>
            </div>
            <div className="absolute bottom-10 left-10">
              <span className="text-white/90 font-black tracking-tighter text-5xl leading-none">
                Kah HaRimu?
              </span>
            </div>
          </div>
        </div>
      </GuestAccess>
    </SiteOffGuard>
  );
}
