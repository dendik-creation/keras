"use client";

import { useEffect, useState, ReactNode } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

export function LegalLayout({ children, title, subtitle, meta }: { children: ReactNode, title: ReactNode, subtitle: ReactNode, meta?: ReactNode }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] font-sans selection:bg-[#FF3000] selection:text-white">
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-[#FF3000] origin-left z-50" style={{ scaleX }} />
      
      <nav className="relative z-20 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b-2 border-[#111111]">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="KeRaS" width={32} height={32} className="w-8 h-8 object-contain" priority />
          <span className="text-xl font-black tracking-tighter text-[#111111]">KeRaS.</span>
        </Link>
        <Link href="/">
          <Button variant="outline" className="rounded-none border-2 border-[#111111] bg-transparent text-[#111111] hover:bg-[#FF3000] hover:text-white hover:border-[#FF3000] uppercase font-bold tracking-widest transition-colors duration-200">
            ← Beranda
          </Button>
        </Link>
      </nav>

      <section className="px-6 pt-16 pb-12 max-w-7xl mx-auto">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-[0.85] uppercase text-[#111111]">
          {title}
        </h1>
        <p className="text-[#555555] font-medium max-w-2xl leading-relaxed text-lg md:text-xl">
          {subtitle}
        </p>
        {meta && (
          <div className="mt-8 flex flex-col md:flex-row gap-4 text-xs font-bold uppercase tracking-widest text-[#555555]">
            {meta}
          </div>
        )}
      </section>

      <LegalDivider />

      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-16 items-start">
        {children}
      </main>

      <LegalBackToTop />
      <div className="w-full h-2 bg-[#FF3000]" />
    </div>
  );
}

export function LegalSidebar({ toc }: { toc: { id: string, label: string, index: string }[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { root: null, rootMargin: "-20% 0px -55% 0px", threshold: 0.35 }
    );

    toc.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  const handleScrollClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsOpen(false);
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <>
      <div className="lg:hidden mb-8">
        <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between border-2 border-[#111111] px-4 py-3 font-bold uppercase tracking-widest text-sm bg-white" aria-expanded={isOpen}>
          <span>Daftar Isi</span>
          <ChevronDown className={clsx("w-5 h-5 transition-transform", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <div className="border-x-2 border-b-2 border-[#111111] bg-white flex flex-col">
            {toc.map(item => (
              <button key={item.id} onClick={() => handleScrollClick(item.id)} className={clsx("text-left px-4 py-3 border-b-2 border-[#111111] last:border-0 font-medium text-sm transition-colors", activeId === item.id ? "bg-[#FF3000] text-white" : "hover:bg-gray-100")}>
                <span className="font-black mr-2">{item.index}</span> {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <aside className="hidden lg:block sticky top-[112px] self-start h-fit max-h-screen">
        <h2 className="text-sm font-black uppercase tracking-widest mb-6 border-b-2 border-[#111111] pb-4">
          Daftar Isi
        </h2>
        <nav className="flex flex-col gap-4">
          {toc.map((item) => (
            <button
              key={item.id}
              onClick={() => handleScrollClick(item.id)}
              className={clsx("text-left text-sm font-medium tracking-wide transition-colors group flex items-start gap-3", activeId === item.id ? "text-[#FF3000]" : "text-[#555555] hover:text-[#111111]")}
            >
              <span className={clsx("font-black tabular-nums transition-colors", activeId === item.id ? "text-[#FF3000]" : "text-[#111111]")}>
                {item.index}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

export function LegalContent({ children }: { children: ReactNode }) {
  return <article className="flex flex-col gap-24 w-full">{children}</article>;
}

export function LegalSection({ id, children }: { id: string, children: ReactNode }) {
  return <section id={id} className="scroll-mt-[120px] text-[#333] space-y-6 leading-relaxed text-base md:text-lg">{children}</section>;
}

export function LegalHeading({ index, title }: { index: string, title: string }) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 border-b-2 border-[#111111] pb-4">
      <span className="text-[#FF3000] font-black text-2xl md:text-3xl tabular-nums tracking-tighter">
        {index}.
      </span>
      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#111111]">
        {title}
      </h2>
    </div>
  );
}

export function LegalTable({ headers, rows }: { headers: string[], rows: ReactNode[][] }) {
  return (
    <div className="w-full overflow-x-auto border-2 border-[#111111] my-8 bg-white">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#111111] text-white">
            {headers.map((h, i) => (
              <th key={i} className="p-4 font-bold uppercase tracking-widest text-xs border-r-2 border-[#111111] last:border-0 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t-2 border-[#111111]">
              {row.map((col, j) => (
                <td key={j} className="p-4 font-medium text-sm text-[#111111] border-r-2 border-[#111111] last:border-0">{col}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalNotice({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-4 border-[#FF3000] pl-6 py-2 my-8 bg-white border-y-2 border-r-2 border-[#111111]">
      <div className="font-bold text-sm uppercase tracking-widest text-[#FF3000] mb-2 mt-2">Notice</div>
      <div className="text-[#555555] font-medium leading-relaxed mb-2">{children}</div>
    </div>
  );
}

export function LegalDivider() {
  return <div className="w-full h-0.5 bg-[#111111]" aria-hidden="true" />;
}

export function LegalBackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const cb = () => setShow(window.scrollY > 500);
    window.addEventListener("scroll", cb);
    return () => window.removeEventListener("scroll", cb);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={clsx("fixed bottom-8 right-8 z-40 w-12 h-12 bg-[#111111] text-white flex items-center justify-center hover:bg-[#FF3000] transition-all duration-300 border-2 border-[#111111]", show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none")}
      aria-label="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
