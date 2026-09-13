import type { Metadata } from "next";

const fallbackSiteUrl = "https://keras.dendikcreation.dev";

function normalizeSiteUrl(value: string | undefined) {
  const candidate = value?.trim() || fallbackSiteUrl;

  try {
    const url = new URL(candidate);
    url.pathname = url.pathname.replace(/\/$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallbackSiteUrl;
  }
}

export const siteConfig = {
  name: "KeRaS",
  url: normalizeSiteUrl(process.env.APP_URL),
  title: "KeRaS | Alat Bantu KRS UMK",
  description:
    "KeRaS membantu mahasiswa UMK menyusun rencana jadwal kuliah untuk persiapan KRS. Alat bantu tidak resmi, bukan sistem akademik Universitas Muria Kudus.",
  locale: "id_ID",
  ogImage: "/og-image.png",
} as const;

export const homepageFaqs = [
  {
    question: "Apa itu KeRaS?",
    answer:
      "KeRaS adalah aplikasi web tidak resmi yang membantu mahasiswa Universitas Muria Kudus membandingkan kelas, menyusun rencana jadwal kuliah, dan menyiapkan proses KRS.",
  },
  {
    question: "Apakah KeRaS merupakan sistem KRS resmi UMK?",
    answer:
      "Bukan. KeRaS dikembangkan secara independen dan tidak dimiliki, dikelola, didukung, atau disediakan secara resmi oleh Universitas Muria Kudus.",
  },
  {
    question: "Apakah KeRaS menggantikan sistem akademik kampus?",
    answer:
      "Tidak. KeRaS membantu tahap persiapan dan dapat meneruskan pilihan melalui sesi pengguna, tetapi hasil akademik tetap harus diperiksa pada sistem resmi kampus.",
  },
  {
    question: "Dari mana informasi jadwal di KeRaS berasal?",
    answer:
      "Informasi mata kuliah dan kelas dibaca dari portal KRS kampus melalui sesi pengguna ketika data diperbarui. Ketersediaan kelas dapat berubah mengikuti sistem resmi.",
  },
] as const;

export function absoluteUrl(path = "/") {
  return new URL(path, `${siteConfig.url}/`).toString();
}

export function pageSocialMetadata(
  title: string,
  description: string,
  path: string,
): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url: path,
      siteName: siteConfig.name,
      title,
      description,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: "KeRaS, alat bantu penyusunan jadwal kuliah mahasiswa UMK",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.ogImage],
    },
  };
}
