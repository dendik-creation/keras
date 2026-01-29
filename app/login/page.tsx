"use client";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CalendarSync, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";

export default function Page() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
      router.push("/make-schedule");
    } catch (error: any) {
      toast.error(error?.message || "Terjadi kesalahan saat login");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <CalendarSync className="size-4" />
            </div>
            <div className="flex flex-col">
              <span>KeRaS</span>
              <span className="text-xs font-normal text-muted-foreground">
                Buat Jadwal KRS-mu lebih cepat dan mudah
              </span>
            </div>
          </a>
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
                    placeholder="••••"
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
              </FieldGroup>
            </form>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1754039984995-a91721ce1870?q=80&w=1561&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
// Compare this snippet from home/bakwankecab/Documents/projects/krs-submitter/app/login/page.tsx:
