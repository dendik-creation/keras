"use client";

import { CalendarCog, Sword } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Jadwalmu", url: "/schedule", icon: CalendarCog },
  { title: "Perang KRS", url: "/submit", icon: Sword },
];

/** Mobile-only bottom navigation for the dashboard (2 destinations). */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav data-tour-mobile="schedule-sidebar-toggle" className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-black grid grid-cols-2 h-16">
      {navItems.map((item) => {
        const isActive =
          pathname === item.url || pathname.includes(item.url);
        const Icon = item.icon;
        return (
          <Link
            key={item.url}
            href={item.url}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 h-full uppercase tracking-widest text-[10px] transition-all duration-200 border-r-2 last:border-r-0 border-black",
              isActive
                ? "bg-black text-white font-black"
                : "bg-white text-black font-semibold active:bg-[#FF3000] active:text-white",
            )}
          >
            {isActive && (
              <span className="absolute top-0 inset-x-0 h-1 bg-[#FF3000]" />
            )}
            <Icon
              className={cn(
                "w-5 h-5 transition-transform duration-200",
                isActive && "scale-110 text-[#FF3000]",
              )}
            />
            <span className={isActive ? "text-white" : ""}>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
