import type { Metadata } from "next";
import LandingPageClient from "@/components/landing/LandingPageClient";
import { homepageFaqs, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: siteConfig.title },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      name: siteConfig.name,
      url: siteConfig.url,
      inLanguage: "id-ID",
      description: siteConfig.description,
    },
    {
      "@type": "WebApplication",
      "@id": `${siteConfig.url}/#application`,
      name: siteConfig.name,
      url: siteConfig.url,
      inLanguage: "id-ID",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description: siteConfig.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "IDR",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${siteConfig.url}/#faq`,
      mainEntity: homepageFaqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPageClient />
    </>
  );
}
