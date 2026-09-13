import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "./globals.css";
import { GooeyToaster } from "@/components/ui/goey-toaster";
import { LocalStorageProvider } from "@/providers/LocalStorageProvider";
import AnalyticsBoot from "@/components/analytics/AnalyticsBoot";
import { CSPostHogProvider } from "@/components/analytics/CSPostHogProvider";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: "/",
  },
  keywords: [
    "KRS",
    "jadwal kuliah",
    "KRS UMK",
    "jadwal kuliah UMK",
    "persiapan KRS",
    "penyusunan jadwal kuliah",
    "Universitas Muria Kudus",
    "KeRaS",
  ],
  authors: [{ name: "dendik-creation", url: "https://dendikcreation.dev" }],
  creator: "dendik-creation",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "KeRaS, alat bantu penyusunan jadwal kuliah mahasiswa UMK",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
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
    <html lang="id">
      <body className={`swiss-noise antialiased`}>
        <CSPostHogProvider>
          <LocalStorageProvider>{children}</LocalStorageProvider>
          <GooeyToaster />
          <AnalyticsBoot />
        </CSPostHogProvider>
      </body>
    </html>
  );
}
