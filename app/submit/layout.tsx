import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perang KRS",
  robots: { index: false, follow: false },
};

export default function SubmitLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
