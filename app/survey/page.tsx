import { Metadata } from "next";
import AppLayout from "@/components/partials/AppLayout";
import { SurveyForm } from "./survey-form";

export const metadata: Metadata = {
  title: "Survei Kepuasan Pengguna - KeRaS",
  description: "Bantu kami meningkatkan kualitas KeRaS dengan mengisi survei singkat.",
  alternates: {
    canonical: "/survey",
  },
  openGraph: {
    title: "Survei Kepuasan Pengguna - KeRaS",
    description: "Bantu kami meningkatkan kualitas KeRaS dengan mengisi survei singkat.",
    url: "/survey",
  },
  twitter: {
    card: "summary_large_image",
    title: "Survei Kepuasan Pengguna - KeRaS",
    description: "Bantu kami meningkatkan kualitas KeRaS dengan mengisi survei singkat.",
  },
};

export default function SurveyPage() {
  return (
    <AppLayout pageTitleHeader="Survei Kepuasan Pengguna" pageDescriptionHeader="Masukan Anda membantu kami membuat KeRaS lebih baik.">
      <div className="max-w-4xl lg:max-w-5xl mx-auto py-8 px-4 sm:px-6 w-full h-full flex flex-col">
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black dark:text-white border-b-4 border-black dark:border-white pb-4 mb-8">
          Survei Kepuasan Pengguna
        </h1>
        <SurveyForm />
      </div>
    </AppLayout>
  );
}
