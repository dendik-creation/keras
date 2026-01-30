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
  LucideProps,
  Send,
} from "lucide-react";
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
    title: "Submit KRS",
    url: "/krs-submit",
    icon: Send,
  },
];

export default function AppSidebar() {
  const pathname = window.location.pathname;
  const items = sidebarNavs;
  return (
    <Sidebar>
      <SidebarContent className="bg-yellow-800 min-h-full relative h-full flex flex-col">
        <SidebarHeader className="mt-3 ms-3 gap-0">
          <span className="text-white/80 font-bold">KeRaS</span>
          <span className="text-white/60 text-sm font-normal">
            Kawal KRS-mu dengan mudah
          </span>
        </SidebarHeader>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item, index: number) => {
                if (item.type === "splitter") {
                  return (
                    <SidebarMenuItem
                      className="border-b border-slate-700 mt-2"
                      key={item.title}
                    >
                      <SidebarMenuButton
                        disabled
                        className="text-white uppercase text-xs"
                      >
                        <ArrowBigRightDash />
                        {item.title}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                } else {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem
                      className="text-white/80 transition-all mb-0.5"
                      key={item.title}
                    >
                      <SidebarMenuButton
                        isActive={
                          pathname == item.url || pathname.includes(item.url)
                        }
                        className="transition-all"
                        asChild
                      >
                        <a
                          href={item.url == pathname ? "#" : item.url}
                          className="flex items-center gap-2"
                        >
                          {Icon && <Icon />}
                          <span>{item.title}</span>
                        </a>
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
