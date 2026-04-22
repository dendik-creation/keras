import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { GooeyToaster } from "@/components/ui/goey-toaster";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "KeRaS",
  description: "Siapkan Jadwal KRS-mu dengan Mudah",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased`}>
        {children}
        <GooeyToaster />
      </body>
    </html>
  );
}
