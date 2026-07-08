"use client";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BadgeCheck, CalendarSync, Loader2 } from "lucide-react";
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
      router.push("/schedule");
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
          <DialogContent className="rounded-none border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#D02020] border-2 border-[#121212] flex items-center justify-center flex-shrink-0">
                  <CalendarSync className="text-white w-4 h-4" />
                </div>
                <DialogTitle className="font-black uppercase tracking-tight text-[#121212]">
                  Hanya Untuk Universitas Muria Kudus
                </DialogTitle>
              </div>
              <div className="w-full h-1 flex">
                <div className="flex-1 bg-[#D02020]" />
                <div className="flex-1 bg-[#1040C0]" />
                <div className="flex-1 bg-[#F0C020]" />
              </div>
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
                  className="rounded-none border-2 border-[#121212] bg-[#D02020] text-white hover:bg-[#121212] shadow-[4px_4px_0px_0px_#121212] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none uppercase font-black tracking-wider transition-all"
                >
                  <BadgeCheck className="w-4 h-4 mr-2" />
                  Saya Paham
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Main Layout ── */}
        <div className="grid min-h-svh lg:grid-cols-2 bg-[#F0F0F0]">
          {/* Left: Form Panel */}
          <div className="flex flex-col p-0">
            {/* Top color band */}
            <div className="flex w-full">
              <div className="flex-1 h-2 bg-[#D02020]" />
              <div className="flex-1 h-2 bg-[#1040C0]" />
              <div className="flex-1 h-2 bg-[#F0C020]" />
            </div>

            <div className="flex flex-col flex-1 p-8 md:p-12">
              {/* Brand */}
              <Link href="/" className="flex items-center gap-3 w-fit mb-auto">
                <div className="w-9 h-9 bg-[#D02020] border-2 border-[#121212] flex items-center justify-center shadow-[3px_3px_0px_0px_#121212]">
                  <CalendarSync className="text-white w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-black uppercase tracking-tighter text-[#121212] text-lg leading-none">
                    KeRaS
                  </span>
                  <span className="text-xs font-medium text-[#555555] leading-none mt-0.5">
                    Buat Jadwal KRS-mu lebih cepat
                  </span>
                </div>
              </Link>

              {/* Form */}
              <div className="flex flex-1 items-center justify-center py-12">
                <div className="w-full max-w-sm">
                  {/* Form heading */}
                  <div className="mb-8">
                    <h1 className="text-4xl mb-2 font-black uppercase tracking-tighter text-[#121212] leading-none">
                      LOGIN DULU WOK
                    </h1>
                    <p className="text-[#555555] text-sm font-medium leading-snug">
                      Masukkan Username dan Password kamu{" "}
                      <span className="text-[#121212] font-bold">
                        (sama seperti kanal)
                      </span>
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <FieldGroup>
                      {/* Username */}
                      <Field>
                        <FieldLabel
                          htmlFor="username"
                          className="text-xs font-black uppercase tracking-widest text-[#121212] mb-1"
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
                          className="rounded-none border-2 border-[#121212] bg-white focus:border-[#1040C0] focus:ring-0 font-medium h-12 shadow-[3px_3px_0px_0px_#121212] focus:shadow-[3px_3px_0px_0px_#1040C0] transition-all"
                        />
                      </Field>

                      {/* Password */}
                      <Field>
                        <FieldLabel
                          htmlFor="password"
                          className="text-xs font-black uppercase tracking-widest text-[#121212] mb-1"
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
                          className="rounded-none border-2 border-[#121212] bg-white focus:border-[#1040C0] focus:ring-0 font-medium h-12 shadow-[3px_3px_0px_0px_#121212] focus:shadow-[3px_3px_0px_0px_#1040C0] transition-all"
                        />
                      </Field>

                      {/* Submit */}
                      <Field>
                        <Button
                          disabled={isLoading}
                          type="submit"
                          className="w-full rounded-none border-4 border-[#121212] bg-[#D02020] text-white hover:bg-[#121212] shadow-[6px_6px_0px_0px_#121212] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none uppercase font-black tracking-widest h-14 text-base transition-all mt-2"
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
                        <div className="border-l-4 border-[#F0C020] pl-3 py-1">
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
                className="text-xs font-bold uppercase tracking-widest text-[#555555] hover:text-[#D02020] transition-colors w-fit"
              >
                ← Kembali ke Beranda
              </Link>
            </div>
          </div>

          {/* Right: Bauhaus Graphic Panel */}
          <div className="hidden lg:flex bg-[#121212] border-l-4 border-[#121212] relative overflow-hidden flex-col items-center justify-center gap-0">
            {/* Color strip at top */}
            <div className="absolute top-0 left-0 right-0 flex">
              <div className="flex-1 h-3 bg-[#D02020]" />
              <div className="flex-1 h-3 bg-[#1040C0]" />
              <div className="flex-1 h-3 bg-[#F0C020]" />
            </div>

            {/* Big geometric composition */}
            <div className="absolute top-16 left-12 w-48 h-48 bg-[#D02020] border-4 border-[#F0F0F0]/20" />
            <div className="absolute top-32 left-32 w-32 h-32 rounded-full bg-[#1040C0] border-4 border-[#F0F0F0]/20" />
            <div className="absolute bottom-24 right-12 w-40 h-40 bg-[#F0C020] border-4 border-[#F0F0F0]/20" />
            <div className="absolute bottom-40 right-32 w-20 h-20 rounded-full bg-[#D02020] border-4 border-[#F0F0F0]/20" />
            {/* Triangle SVG */}
            <svg
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10"
              width="320"
              height="320"
              viewBox="0 0 80 80"
            >
              <polygon
                points="40,4 76,72 4,72"
                fill="#F0F0F0"
                stroke="#F0F0F0"
                strokeWidth="2"
              />
            </svg>

            {/* Bottom color strip */}
            <div className="absolute bottom-0 left-0 right-0 flex">
              <div className="flex-1 h-3 bg-[#F0C020]" />
              <div className="flex-1 h-3 bg-[#1040C0]" />
              <div className="flex-1 h-3 bg-[#D02020]" />
            </div>
          </div>
        </div>
      </GuestAccess>
    </SiteOffGuard>
  );
}
