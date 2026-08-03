import type { Metadata } from "next";
import {
  LegalLayout,
  LegalSidebar,
  LegalContent,
  LegalSection,
  LegalHeading,
  LegalTable,
  LegalNotice
} from "@/components/custom/legal";
import { Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Pelajari bagaimana KeRaS memproses data, menjaga privasi, dan menerapkan prinsip Zero Database.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | KeRaS",
    description: "Pelajari bagaimana KeRaS memproses data, menjaga privasi, dan menerapkan prinsip Zero Database.",
    url: "/privacy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | KeRaS",
    description: "Pelajari bagaimana KeRaS memproses data, menjaga privasi, dan menerapkan prinsip Zero Database.",
  }
};

const toc = [
  { id: "overview", label: "Overview", index: "01" },
  { id: "data", label: "Data yang Diproses", index: "02" },
  { id: "zero-db", label: "Zero Database", index: "03" },
  { id: "analytics", label: "Analytics", index: "04" },
  { id: "ai", label: "AI", index: "05" },
  { id: "share", label: "Share Schedule", index: "06" },
  { id: "security", label: "Security", index: "07" },
  { id: "rights", label: "Hak Pengguna", index: "08" },
  { id: "changes", label: "Perubahan", index: "09" },
  { id: "contact", label: "Kontak", index: "10" }
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title={<>Privacy<br />Policy</>}
      subtitle="Kami percaya jadwal kuliah adalah milikmu. KeRaS tidak menjual maupun menyimpan data akademik pribadi."
      meta={
          <span>Berlaku sejak 28 Jul 2026 </span>
      }
    >
      <LegalSidebar toc={toc} />

      <LegalContent>
        <LegalSection id="overview">
          <LegalHeading index="01" title="Overview" />
          <p>
            KeRaS dirancang untuk membantu mahasiswa menyusun jadwal KRS tanpa ribet. Kami ingin menegaskan bahwa <strong>KeRaS bukan sistem resmi universitas</strong>.
          </p>
          <p>
            Posisi KeRaS murni sebagai <em>bridge</em> (jembatan) antara browser kamu dan portal kampus, untuk memberikan antarmuka yang lebih baik dan fitur yang tidak tersedia secara native.
          </p>
        </LegalSection>

        <LegalSection id="data">
          <LegalHeading index="02" title="Data yang Diproses" />
          <p>
            Berikut adalah rincian data yang kami proses dan status penyimpanannya:
          </p>
          <LegalTable
            headers={["Jenis Data", "Diproses", "Disimpan Permanen"]}
            rows={[
              ["Session Cookie", <Check key="1" className="text-green-600" />, <X key="2" className="text-red-600" />],
              ["Offering Course", <Check key="3" className="text-green-600" />, "Local Browser"],
              ["Share Schedule", <Check key="4" className="text-green-600" />, "Short Link"],
              ["Analytics", <Check key="5" className="text-green-600" />, "Anonymous"],
              ["AI Prompt", <Check key="6" className="text-green-600" />, "Temporary"]
            ]}
          />
        </LegalSection>

        <LegalSection id="zero-db">
          <LegalHeading index="03" title="Zero Database" />
          <p>
            Kami menganut prinsip Zero Database untuk data pribadi. Alur komunikasi terjadi secara langsung dan tersentralisasi pada sisi klien.
          </p>
          <div className="font-mono text-sm bg-white border-2 border-[#111111] p-6 my-6 text-center font-semibold tracking-wider flex flex-col items-center gap-4">
            <div className="border-2 border-[#111111] py-2 px-6 w-full max-w-xs">Browser</div>
            <div>↓</div>
            <div className="border-2 border-[#FF3000] text-[#FF3000] py-2 px-6 w-full max-w-xs">KeRaS Bridge</div>
            <div>↓</div>
            <div className="border-2 border-[#111111] py-2 px-6 w-full max-w-xs">KRS Kampus</div>
          </div>
          <p>
            KeRaS tidak memiliki database relasional untuk menyimpan credential, riwayat KRS, atau data jadwal secara permanen.
          </p>
        </LegalSection>

        <LegalSection id="analytics">
          <LegalHeading index="04" title="Analytics" />
          <p>
            Kami menggunakan <strong>PostHog</strong> untuk mengumpulkan data penggunaan secara anonim guna keperluan evaluasi dan pengembangan.
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-4 font-medium text-[#555555]">
            <li>NIM pengguna tidak pernah dikirim secara penuh (selalu di-masking, misal: <code className="bg-gray-200 px-1 py-0.5 rounded text-black">202451***</code>).</li>
            <li>Tidak ada data pribadi yang dikumpulkan.</li>
            <li>Tidak ada password yang direkam.</li>
            <li>Tidak ada cookie tracking marketing.</li>
          </ul>
        </LegalSection>

        <LegalSection id="ai">
          <LegalHeading index="05" title="AI" />
          <p>
            Saat menggunakan fitur <strong>Generate Schedule AI</strong>, data jadwal yang relevan akan dikirim secara <em>sementara</em> ke endpoint AI yang dikonfigurasi administrator.
          </p>
          <LegalNotice>
            Data ini diproses sekadar untuk mendapatkan rekomendasi dan tidak akan pernah digunakan sebagai data latih (training) oleh KeRaS maupun penyedia model.
          </LegalNotice>
        </LegalSection>

        <LegalSection id="share">
          <LegalHeading index="06" title="Share Schedule" />
          <p>
            Fitur bagikan jadwal (Share Schedule) dibuat seaman mungkin. Yang dibagikan melalui link publik hanyalah identitas jadwal / kode mata kuliah.
          </p>
          <p>
            KeRaS <strong>tidak pernah</strong> membagikan password, session login, ataupun detail personal melalui fitur ini.
          </p>
        </LegalSection>

        <LegalSection id="security">
          <LegalHeading index="07" title="Security" />
          <p>
            Langkah keamanan yang kami terapkan:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-4 font-medium text-[#555555]">
            <li>Semua komunikasi melalui Server-side bridge dengan protokol HTTPS.</li>
            <li>Proteksi bot dengan Cloudflare Turnstile.</li>
            <li>Short Link validation.</li>
            <li>Strict Session validation untuk mencegah manipulasi cookie.</li>
          </ul>
        </LegalSection>

        <LegalSection id="rights">
          <LegalHeading index="08" title="Hak Pengguna" />
          <p>Sebagai pengguna, kamu memiliki kontrol penuh. Kamu berhak untuk:</p>
          <ul className="list-disc pl-6 space-y-2 mt-4 font-medium text-[#555555]">
            <li>Menghapus semua local data kapan saja.</li>
            <li>Melakukan logout secara aman.</li>
            <li>Menolak penggunaan analitik (melalui ad-blocker atau fitur do-not-track jika dimungkinkan).</li>
            <li>Menghapus browser storage secara mandiri.</li>
          </ul>
        </LegalSection>

        <LegalSection id="changes">
          <LegalHeading index="09" title="Perubahan Privacy Policy" />
          <p>
            Kebijakan ini dapat berubah sewaktu-waktu tanpa pemberitahuan langsung ke setiap pengguna. Perubahan akan selalu tercatat pada riwayat repositori publik kami.
          </p>
        </LegalSection>

        <LegalSection id="contact">
          <LegalHeading index="10" title="Kontak" />
          <p>
            Punya pertanyaan atau menemukan celah keamanan? Laporkan secara langsung melalui repositori kami.
          </p>
          <div className="mt-6">
            <a href="https://github.com/dendik-creation/keras/issues" target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center border-2 border-[#111111] bg-white px-8 font-semibold uppercase tracking-wider text-sm text-[#111111] hover:bg-[#FF3000] hover:text-white hover:border-[#FF3000] transition-colors">
              GitHub Issues
            </a>
          </div>
        </LegalSection>

      </LegalContent>
    </LegalLayout>
  );
}
