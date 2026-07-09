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

export default function AppSidebar() {
  const pathname = usePathname();
  const items = sidebarNavs;
  return (
    <Sidebar>
      <SidebarContent className="bg-white border-r-2 border-black min-h-full relative h-full flex flex-col">
        {/* Brand mark */}
        <SidebarHeader className="mt-0 p-0 gap-0 border-b-2 border-black">
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
        </SidebarHeader>

        <SidebarGroup className="pt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                if (item.type === "splitter") {
                  return (
                    <SidebarMenuItem
                      className="border-b-2 border-black mt-2 mx-2"
                      key={item.title}
                    >
                      <SidebarMenuButton
                        disabled
                        className="text-black uppercase text-xs font-black tracking-widest"
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
                          rounded-none transition-colors duration-200 border-2 font-bold uppercase tracking-widest text-sm
                          ${
                            isActive
                              ? "bg-black text-black! border-black hover:bg-black"
                              : "bg-transparent text-black border-transparent hover:bg-[#FF3000] hover:text-white hover:border-[#FF3000]"
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
