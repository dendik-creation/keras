import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adopsi Jadwal",
  robots: { index: false, follow: false },
};

export default function AdoptScheduleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
