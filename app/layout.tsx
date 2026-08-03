import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "./globals.css";
import { GooeyToaster } from "@/components/ui/goey-toaster";
import { LocalStorageProvider } from "@/providers/LocalStorageProvider";
import AnalyticsBoot from "@/components/analytics/AnalyticsBoot";
import { CSPostHogProvider } from "@/components/analytics/CSPostHogProvider";

const siteUrl = process.env.APP_URL ?? "https://keras.dendikcreation.dev";
const siteTitle = "KeRaS";
const siteDescription =
  "Siapkan jadwal KRS-mu dengan mudah — objektif, cepat, tanpa drama. Perang KRS satu klik, tanpa simpan data pribadi.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteTitle} — Siapkan Jadwal KRS-mu dengan Mudah`,
    template: `%s — ${siteTitle}`,
  },
  description: siteDescription,
  applicationName: siteTitle,
  alternates: {
    canonical: siteUrl,
  },
  keywords: [
    "KRS",
    "jadwal kuliah",
    "perang KRS",
    "KRS mahasiswa",
    "krs umk",
    "krs universitas muria kudus",
    "mata kuliah umk",
    "mata kuliah universitas muria kudus",
    "penjadwalan mata kuliah",
    "KeRaS",
  ],
  authors: [{ name: "dendik-creation", url: "https://dendikcreation.dev" }],
  creator: "dendik-creation",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteTitle,
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
    locale: "id_ID",
    url: siteUrl,
    siteName: siteTitle,
    title: `${siteTitle} — Siapkan Jadwal KRS-mu dengan Mudah`,
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KeRaS — Siapkan Jadwal KRS-mu dengan Mudah",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteTitle} — Siapkan Jadwal KRS-mu dengan Mudah`,
    description: siteDescription,
    images: ["/og-image.png"],
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
    <html lang="en">
      <body className={`swiss-noise antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  name: siteTitle,
                  url: siteUrl,
                  description: siteDescription,
                },
                {
                  "@type": "SoftwareApplication",
                  name: siteTitle,
                  url: siteUrl,
                  description: siteDescription,
                  applicationCategory: "EducationalApplication",
                  operatingSystem: "Web",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                  },
                }
              ]
            }),
          }}
        />
        <CSPostHogProvider>
          <LocalStorageProvider>{children}</LocalStorageProvider>
          <GooeyToaster />
          <AnalyticsBoot />
        </CSPostHogProvider>
      </body>
    </html>
  );
}
