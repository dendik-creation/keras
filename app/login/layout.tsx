import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk",
  description:
    "Masuk ke KeRaS menggunakan akun kampus untuk menyusun rencana jadwal kuliah.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
