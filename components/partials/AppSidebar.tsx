"use client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ArrowBigRightDash,
  CalendarCog,
  LucideProps,
  Sword,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ForwardRefExoticComponent, RefAttributes } from "react";

type NavItems = {
  type: "item" | "splitter";
  title: string;
  url: string;
  icon?: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
}[];

const sidebarNavs: NavItems = [
  {
    type: "item",
    title: "Jadwalmu",
    url: "/schedule",
    icon: CalendarCog,
  },
  {
    type: "item",
    title: "Perang KRS",
    url: "/submit",
    icon: Sword,
  },
];

interface AppSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AppSidebar({ open, onOpenChange }: AppSidebarProps) {
  const pathname = usePathname();
  const items = sidebarNavs;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="bg-white border-r-2 border-black p-0 gap-0 w-72 sm:max-w-none"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Navigasi utama KeRaS</SheetDescription>
        </SheetHeader>

        {/* Brand mark */}
        <div className="mt-0 border-b-2 border-black">
          <div className="flex items-center gap-3 px-4 py-4">
            <Image
              src="/logo.png"
              alt="KeRaS"
              width={32}
              height={32}
              className="w-8 h-8 object-contain flex-shrink-0"
              priority
            />
            <div className="flex flex-col">
              <span className="text-black font-black uppercase tracking-tighter text-base leading-none">
                KeRaS
              </span>
              <span className="text-[#555555] text-xs font-medium mt-0.5 leading-none">
                Kawal KRS-mu dengan mudah
              </span>
            </div>
          </div>
          {/* Swiss accent strip */}
          <div className="w-full h-1.5 bg-[#FF3000]" />
        </div>

        <ul className="flex w-full min-w-0 flex-col gap-1 pt-4">
          {items.map((item) => {
            if (item.type === "splitter") {
              return (
                <li
                  className="border-b-2 border-black mt-2 mx-2"
                  key={item.title}
                >
                  <button
                    disabled
                    className="flex w-full items-center gap-2 p-2 text-black uppercase text-xs font-black tracking-widest"
                  >
                    <ArrowBigRightDash />
                    {item.title}
                  </button>
                </li>
              );
            } else {
              const isActive =
                pathname === item.url || pathname.includes(item.url);
              const Icon = item.icon;
              return (
                <li className="mx-2 mb-1" key={item.title}>
                  <Link
                    href={item.url === pathname ? "#" : item.url}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-none transition-colors duration-200 border-2 font-bold uppercase tracking-widest text-sm",
                      isActive
                        ? "bg-accent text-white border-black hover:border-black"
                        : "bg-transparent border-black text-black  hover:bg-[#FF3000] hover:text-white hover:border-[#FF3000]",
                    )}
                  >
                    {Icon && (
                      <div className="w-6 h-6 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                    )}
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            }
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
