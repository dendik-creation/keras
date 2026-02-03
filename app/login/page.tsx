"use client";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BadgeCheck, CalendarSync, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { setLocalStorage } from "@/helper/local_storage";
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
        toast.error(response.data?.message, {
          richColors: true,
        });
        return;
      }
      const data = response.data;
      if (data?.user) {
        setLocalStorage("active_user", data.user);
      }
      router.push("/schedule");
    } catch (error: any) {
      toast.error(error?.message || "Terjadi kesalahan saat login", {
        richColors: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <GuestAccess>
      {/*Disclaimer Dialog*/}
      <Dialog open={!isDisclaimerAccepted}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hanya Untuk Universitas Muria Kudus</DialogTitle>
            <DialogDescription>
              KeRaS adalah alat bantu untuk mempercepat proses pengisian KRS.
              Penggunaan sistem ini sepenuhnya menjadi tanggung jawab pengguna.
              Selalu periksa kembali jadwal KRS yang telah diisi sebelum
              mengirimkannya ke sistem resmi universitas. Kami tidak bertanggung
              jawab atas kesalahan atau masalah yang mungkin terjadi akibat
              penggunaan KeRaS.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                onClick={() => handleDisclaimerChange(true)}
                variant="outline"
              >
                <BadgeCheck />
                Saya paham
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <Link href="/" className="flex items-center gap-2 font-medium">
              <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <CalendarSync className="size-4" />
              </div>
              <div className="flex flex-col">
                <span>KeRaS</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Buat Jadwal KRS-mu lebih cepat dan mudah
                </span>
              </div>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <FieldGroup>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">Login Dulu</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                      Masukkan Username dan Password Kamu (sama seperti kanal)
                    </p>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input
                      disabled={isLoading}
                      id="username"
                      type="text"
                      autoFocus
                      placeholder="Username"
                      required
                      onChange={handleChange}
                      value={form.username}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="****"
                      disabled={isLoading}
                      required
                      onChange={handleChange}
                      value={form.password}
                    />
                  </Field>
                  <Field>
                    <Button disabled={isLoading} type="submit">
                      {isLoading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <span>Login</span>
                      )}
                    </Button>
                  </Field>
                  <Field>
                    <span className="text-xs text-center text-muted-foreground">
                      Tidak dirancang untuk berpindah-pindah akun
                    </span>
                  </Field>
                </FieldGroup>
              </form>
            </div>
          </div>
        </div>
        <div className="bg-violet-900 relative hidden lg:block" />
      </div>
    </GuestAccess>
  );
}
