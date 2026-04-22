"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  ArrowBigRightDash,
  CalendarCog,
  CalendarSync,
  LucideProps,
  Sword,
} from "lucide-react";
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

export default function AppSidebar() {
  const pathname = usePathname();
  const items = sidebarNavs;
  return (
    <Sidebar>
      <SidebarContent className="bg-[#F0F0F0] border-r-4 border-[#121212] min-h-full relative h-full flex flex-col">
        {/* Brand mark */}
        <SidebarHeader className="mt-0 p-0 gap-0 border-b-4 border-[#121212]">
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="w-8 h-8 bg-[#D02020] border-2 border-[#121212] flex items-center justify-center flex-shrink-0">
              <CalendarSync className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[#121212] font-black tracking-tighter text-base leading-none">
                KeRaS.
              </span>
              <span className="text-[#555555] text-xs font-medium mt-0.5 leading-none">
                Kawal KRS-mu dengan mudah
              </span>
            </div>
          </div>
          {/* Bauhaus color strip */}
          <div className="flex w-full">
            <div className="flex-1 h-1.5 bg-[#D02020]" />
            <div className="flex-1 h-1.5 bg-[#1040C0]" />
            <div className="flex-1 h-1.5 bg-[#F0C020]" />
          </div>
        </SidebarHeader>

        <SidebarGroup className="pt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                if (item.type === "splitter") {
                  return (
                    <SidebarMenuItem
                      className="border-b-2 border-[#121212] mt-2 mx-2"
                      key={item.title}
                    >
                      <SidebarMenuButton
                        disabled
                        className="text-[#121212] uppercase text-xs font-black tracking-widest"
                      >
                        <ArrowBigRightDash />
                        {item.title}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                } else {
                  const isActive =
                    pathname === item.url || pathname.includes(item.url);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem className="mx-2 mb-1" key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        className={`
                          rounded-none transition-none border-2 font-bold uppercase tracking-wide text-sm
                          ${
                            isActive
                              ? "bg-[#D02020] text-[#121212]! border-[#121212] shadow-[3px_3px_0px_0px_#121212]"
                              : "bg-transparent text-[#121212] border-transparent hover:bg-[#F0C020] hover:text-[#121212] hover:border-[#121212]"
                          }
                        `}
                        asChild
                      >
                        <Link
                          href={item.url === pathname ? "#" : item.url}
                          className="flex items-center gap-2 px-3 py-2"
                        >
                          {Icon && (
                            <div
                              className={`w-6 h-6 flex items-center justify-center ${
                                isActive ? "" : ""
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                          )}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
