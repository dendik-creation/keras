import type { Metadata } from "next";
import ShareScheduleClient from "@/components/custom/ShareScheduleClient";

const title = "Jadwal Dibagikan";
const description =
  "Ada yang bagikan jadwal KRS lewat KeRaS. Cek dan adopsi jadwalnya di sini.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    title: `${title} — KeRaS`,
    description,
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
    title: `${title} — KeRaS`,
    description,
    images: ["/og-image.png"],
  },
};

export default async function ShareSchedulePage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
  return <ShareScheduleClient shortCode={shortCode} />;
}
