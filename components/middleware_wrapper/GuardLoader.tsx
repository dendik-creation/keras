import LoadingBooks from "@/components/ui/loading-books";

/** Swiss-style full-screen loading state shared by the access guards. */
export default function GuardLoader() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white swiss-grid-pattern">
      <LoadingBooks className="h-40 w-40" />
      <span className="text-xs font-bold tracking-widest text-[#555555]">
        BentaR
      </span>
    </div>
  );
}
