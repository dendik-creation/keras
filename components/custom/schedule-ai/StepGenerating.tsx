"use client";

/** Step shown in place of the form while the AI request is in flight. */
export default function StepGenerating() {
  return (
    <div className="border-2 border-black bg-white">
      <div className="border-b-2 border-black bg-black px-4 py-2.5">
        <h4 className="font-black uppercase tracking-wide text-xs text-white">
          Membuat Jadwal
        </h4>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 px-6 py-8">
        <iframe
          src="https://lottie.host/embed/e65fda84-9e51-4089-920a-16ee92a6b150/cxVd3uzyLc.lottie"
          className="h-56 w-56 border-0"
          title="Membuat jadwal"
        />
        <p className="text-xs font-semibold text-[#555555]">
          BentaR, sedang ngeracik jadwalmu...
        </p>
      </div>
    </div>
  );
}
