import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GooeyToaster } from "@/components/ui/goey-toaster";
import TurnstileGuard from "@/components/middleware_wrapper/TurnstileGuard";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  // Variable font: one file serves every weight (400–900). No `weight` array,
  // otherwise Next fetches a separate static file per weight.
  display: "swap",
});

export const metadata: Metadata = {
  title: "KeRaS",
  description: "Siapkan Jadwal KRS-mu dengan Mudah",
  applicationName: "KeRaS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KeRaS",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} swiss-noise antialiased`}>
        <TurnstileGuard>{children}</TurnstileGuard>
        <GooeyToaster />
      </body>
    </html>
  );
}
