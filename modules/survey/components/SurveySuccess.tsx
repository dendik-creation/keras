import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export function SurveySuccess() {
  const router = useRouter();

  return (
    <Card className="max-w-xl mx-auto w-full mt-8 border-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
      <CardContent className="pt-12 pb-12 flex flex-col items-center text-center px-6">
        <div className="w-20 h-20 bg-[#FF3000] rounded-full flex items-center justify-center mb-6 border-2 border-black dark:border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold uppercase tracking-tight mb-4 text-black dark:text-white">
          Survei Berhasil Dikirim!
        </h2>
        <p className="text-gray-600 dark:text-zinc-300 mb-8 max-w-md text-sm leading-relaxed">
          Terima kasih telah membantu meningkatkan ekosistem KeRaS. Masukan Anda sangat berharga bagi kami dalam mengembangkan pengalaman penyusunan KRS yang lebih baik.
        </p>
        <Button
          type="button"
          onClick={() => router.push("/")}
          className="w-full sm:w-auto px-8 uppercase font-bold tracking-wider rounded-none bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 border-2 border-black dark:border-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
        >
          Kembali ke Beranda
        </Button>
      </CardContent>
    </Card>
  );
}
