import type { Metadata } from "next";
import ShareScheduleClient from "@/components/custom/ShareScheduleClient";

export const metadata: Metadata = {
  title: "Jadwal Dibagikan",
  description: "Ada yang bagikan jadwal KRS lewat KeRaS. Cek dan adopsi jadwalnya di sini.",
  robots: { index: false, follow: false },
};

export default async function ShareSchedulePage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
  return <ShareScheduleClient shortCode={shortCode} />;
}
