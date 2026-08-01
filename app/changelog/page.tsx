import type { Metadata } from "next";
import {
  LegalLayout,
  LegalSidebar,
  LegalContent,
  LegalSection,
  LegalHeading,
} from "@/components/custom/legal";
import changelogHistories from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog | KeRaS",
  description: "Catatan perubahan, pembaruan fitur, dan riwayat rilis platform KeRaS.",
  alternates: {
    canonical: "/changelog",
  },
  openGraph: {
    title: "Changelog | KeRaS",
    description: "Catatan perubahan, pembaruan fitur, dan riwayat rilis platform KeRaS.",
    url: "/changelog",
  }
};

const toc = changelogHistories.map((item, idx) => ({
  id: `v${item.version.replace(/\./g, "-")}`,
  label: `${item.title}`,
  index: String(idx + 1).padStart(2, "0"),
}));

const latestVersion = changelogHistories[0]?.version ?? "—";

export default function ChangelogPage() {
  return (
    <LegalLayout
      title={"Perjalanan KeRaS"}
      subtitle="Catatan perubahan, fitur baru, serta riwayat pengembangan platform KeRaS."
      meta={
        <span>Terbaru {latestVersion}</span>
      }
    >
      <LegalSidebar toc={toc} />

      <LegalContent>
        {changelogHistories.map((item, idx) => {
          const sectionId = `v${item.version.replace(/\./g, "-")}`;
          const sectionIndex = String(idx + 1).padStart(2, "0");
          return (
            <LegalSection key={item.version} id={sectionId}>
              <LegalHeading index={sectionIndex} title={`${item.title}`} />
              <div className="text-xs font-bold uppercase tracking-widest text-[#555555] -mt-2 mb-4">
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
