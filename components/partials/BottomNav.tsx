"use client";

import { CalendarCog, Sword } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { title: "Jadwalmu", url: "/schedule", icon: CalendarCog },
  { title: "Perang KRS", url: "/submit", icon: Sword },
];

/** Mobile-only bottom navigation for the dashboard (2 destinations). */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-black grid grid-cols-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.url || pathname.includes(item.url);
        const Icon = item.icon;
        return (
          <Link
            key={item.url}
            href={item.url}
            className={`flex flex-col items-center justify-center gap-1 h-16 uppercase tracking-widest text-[10px] font-black transition-colors duration-200 border-r-2 last:border-r-0 border-black ${
              isActive
                ? "bg-black text-white"
                : "bg-white text-black active:bg-[#FF3000] active:text-white"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
