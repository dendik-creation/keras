import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jadwal",
  robots: { index: false, follow: false },
};

export default function ScheduleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
