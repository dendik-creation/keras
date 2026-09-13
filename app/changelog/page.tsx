import type { Metadata } from "next";
import {
  LegalLayout,
  LegalSidebar,
  LegalContent,
  LegalSection,
  LegalHeading,
} from "@/components/custom/legal";
import changelogHistories from "@/lib/changelog";
import { pageSocialMetadata } from "@/lib/site";

const pageDescription =
  "Catatan perubahan, pembaruan fitur, dan riwayat rilis KeRaS.";

export const metadata: Metadata = {
  title: "Changelog",
  description: pageDescription,
  alternates: {
    canonical: "/changelog",
  },
  ...pageSocialMetadata("Changelog | KeRaS", pageDescription, "/changelog"),
};

const toc = changelogHistories.map((item, idx) => ({
  id: `v${item.version.replace(/\./g, "-")}`,
  label: `${item.title}`,
  index: String(idx + 1).padStart(2, "0"),
}));

const latestVersion = changelogHistories[0]?.version ?? "Belum ada";

export default function ChangelogPage() {
  return (
    <LegalLayout
      title={"Perjalanan KeRaS"}
      subtitle="Catatan perubahan, fitur baru, serta riwayat pengembangan platform KeRaS."
      meta={
        <span>Terbaru {latestVersion}</span>
      }
    >
      <LegalSidebar reverseNumberIndex toc={toc} />

      <LegalContent>
        {changelogHistories.map((item, idx) => {
          const sectionId = `v${item.version.replace(/\./g, "-")}`;
          const sectionIndexReversed = String(changelogHistories.length - idx).padStart(2, "0");
          return (
            <LegalSection key={item.version} id={sectionId}>
              <LegalHeading index={sectionIndexReversed} title={`${item.title}`} />
              <div className="text-xs font-medium uppercase tracking-wider text-[#555555] -mt-2 mb-4">
                {item.version} | {item.date}
              </div>
              <ul className="list-disc pl-6 space-y-2 mt-4 font-medium text-[#555555]">
                {item.changes.map((change, cIdx) => (
                  <li key={cIdx}>{change}</li>
                ))}
              </ul>
            </LegalSection>
          );
        })}
      </LegalContent>
    </LegalLayout>
  );
}
