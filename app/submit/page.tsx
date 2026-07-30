import SubmitClientPage from "./SubmitClientPage";

export const dynamic = "force-dynamic";

export default function Page() {
  const warTestMode =
    process.env.NEXT_PUBLIC_WAR_TEST_MODE === "true" ||
    process.env.WAR_TEST_MODE === "true";

  return (
    <SubmitClientPage
      warTestMode={warTestMode}
    />
  );
}
