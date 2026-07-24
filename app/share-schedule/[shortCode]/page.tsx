import ShareScheduleClient from "@/components/custom/ShareScheduleClient";

export default async function ShareSchedulePage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
  return <ShareScheduleClient shortCode={shortCode} />;
}
