import SubmitClientPage from "./SubmitClientPage";

export const dynamic = "force-dynamic";

export default function Page() {
  const warTestMode =
    process.env.NEXT_PUBLIC_WAR_TEST_MODE === "true" ||
    process.env.WAR_TEST_MODE === "true";

  const initialDelayStr =
    process.env.NEXT_PUBLIC_SUBMIT_INITIAL_DELAY_MS ||
    process.env.SUBMIT_INITIAL_DELAY_MS;
  const initialDelayMs = initialDelayStr ? parseInt(initialDelayStr, 10) : 0;

  return (
    <SubmitClientPage
      warTestMode={warTestMode}
      initialDelayMs={initialDelayMs}
    />
  );
}
