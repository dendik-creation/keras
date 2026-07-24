/** Swiss-style full-screen loading state shared by the access guards. */
export default function GuardLoader() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-white swiss-grid-pattern">
      <div className="relative w-16 h-16 border-2 border-black">
        <div className="absolute inset-1 bg-[#FF3000] animate-spin" />
      </div>
      <span className="text-xs font-bold tracking-widest text-[#555555]">
        BentaR
      </span>
    </div>
  );
}
