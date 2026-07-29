import type { Metadata } from "next";
import {
  LegalLayout,
  LegalSidebar,
  LegalContent,
  LegalSection,
  LegalHeading,
  LegalNotice
} from "@/components/custom/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions | KeRaS",
  description: "Syarat dan ketentuan penggunaan platform KeRaS.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms & Conditions | KeRaS",
    description: "Syarat dan ketentuan penggunaan platform KeRaS.",
    url: "/terms",
  }
};

const toc = [
  { id: "tentang", label: "Tentang KeRaS", index: "01" },
  { id: "syarat", label: "Persyaratan Penggunaan", index: "02" },
  { id: "tanggung-jawab", label: "Tanggung Jawab Pengguna", index: "03" },
  { id: "uptime", label: "Ketersediaan Sistem", index: "04" },
  { id: "perang", label: "Perang KRS", index: "05" },
  { id: "ai", label: "Generate Schedule AI", index: "06" },
  { id: "share", label: "Share Schedule", index: "07" },
  { id: "zero-db", label: "Zero Database", index: "08" },
  { id: "batas", label: "Batas Tanggung Jawab", index: "09" },
  { id: "perubahan", label: "Perubahan Ketentuan", index: "10" }
];

export default function TermsPage() {
  return (
    <LegalLayout
      title={<>Terms &<br />Conditions</>}
      subtitle="Menggunakan KeRaS berarti memahami bagaimana sistem bekerja serta batas tanggung jawab platform."
      meta={
        <span>Berlaku sejak 28 Jul 2026 </span>
      }
    >
      <LegalSidebar toc={toc} />

      <LegalContent>
        <LegalSection id="tentang">
          <LegalHeading index="01" title="Tentang KeRaS" />
          <p>
            KeRaS adalah alat bantu (tool) independen yang dirancang untuk memudahkan mahasiswa menyusun jadwal. <strong>KeRaS bukan layanan resmi universitas</strong>. Kami tidak berafiliasi dengan, disponsori oleh, atau memiliki hubungan resmi dengan universitas mana pun.
          </p>
        </LegalSection>

        <LegalSection id="syarat">
          <LegalHeading index="02" title="Persyaratan Penggunaan" />
          <p>
            Untuk menggunakan fitur KeRaS secara penuh, pengguna harus memiliki akun resmi universitas yang valid.
          </p>
        </LegalSection>

        <LegalSection id="tanggung-jawab">
          <LegalHeading index="03" title="Tanggung Jawab Pengguna" />
          <p>
            Keamanan akun universitas (termasuk password) tetap menjadi tanggung jawab pengguna sepenuhnya. Kami menyarankan untuk selalu menjaga kerahasiaan kredensial dan logout setelah selesai menggunakan layanan.
          </p>
        </LegalSection>

        <LegalSection id="uptime">
          <LegalHeading index="04" title="Ketersediaan Sistem" />
          <p>
            Meskipun kami berusaha memberikan layanan terbaik, KeRaS beroperasi secara independen dan bergantung pada stabilitas portal kampus. Oleh karena itu, <strong>kami tidak menjamin 100% uptime</strong>.
          </p>
        </LegalSection>

        <LegalSection id="perang">
          <LegalHeading index="05" title="Perang KRS" />
          <p>
            Fitur Perang KRS membantu melakukan submit secara otomatis berdasarkan konfigurasi jadwal pengguna.
          </p>
          <LegalNotice>
            Fitur ini <strong>tidak menjamin</strong> bahwa kelas pasti didapat. Keberhasilan sepenuhnya bergantung pada: server universitas, kuota kelas, dan jaringan pengguna.
          </LegalNotice>
        </LegalSection>

        <LegalSection id="ai">
          <LegalHeading index="06" title="Generate Schedule AI" />
          <p>
            AI hanya berfungsi memberikan rekomendasi jadwal berdasarkan input pengguna. Mahasiswa tetap bertanggung jawab penuh terhadap pemilihan dan validitas jadwal akhir sebelum disubmit.
          </p>
        </LegalSection>

        <LegalSection id="share">
          <LegalHeading index="07" title="Share Schedule" />
          <p>
            Pengguna bertanggung jawab penuh terhadap link jadwal yang dibagikan kepada publik. Pastikan link hanya dibagikan kepada pihak yang kamu percayai.
          </p>
        </LegalSection>

        <LegalSection id="zero-db">
          <LegalHeading index="08" title="Zero Database" />
          <p>
            Sesuai dengan kebijakan Zero Database, KeRaS tidak menyimpan jadwal secara permanen di server. Jika browser cache/storage dibersihkan, data lokal dapat hilang dan tidak dapat dipulihkan melalui server KeRaS.
          </p>
        </LegalSection>

        <LegalSection id="batas">
          <LegalHeading index="09" title="Batas Tanggung Jawab" />
          <p>
            KeRaS dibebaskan dari segala tuntutan dan tidak bertanggung jawab terhadap:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-4 font-medium text-[#555555]">
            <li>Perubahan jadwal dari pihak kampus.</li>
            <li>Perubahan course code (kode mata kuliah).</li>
            <li>Perubahan kuota kelas secara mendadak.</li>
            <li>Downtime portal kampus.</li>
            <li>Kegagalan submit akibat error atau overload pada server kampus.</li>
          </ul>
        </LegalSection>

        <LegalSection id="perubahan">
          <LegalHeading index="10" title="Perubahan Ketentuan" />
          <p>
            Ketentuan ini dapat diubah sewaktu-waktu. Pengguna disarankan untuk meninjau halaman ini secara berkala. Penggunaan KeRaS yang berkelanjutan setelah adanya perubahan menandakan bahwa pengguna menerima dan menyetujui perubahan tersebut.
          </p>
        </LegalSection>

      </LegalContent>
    </LegalLayout>
  );
}
