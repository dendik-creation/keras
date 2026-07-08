import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GooeyToaster } from "@/components/ui/goey-toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
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
        {children}
        <GooeyToaster />
      </body>
    </html>
  );
}
