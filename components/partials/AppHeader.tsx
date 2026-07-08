"use client";
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CalendarSync, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LogoutMenu from "@/components/custom/LogoutMenu";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppHeaderProps {
  classNames?: string;
  name: string;
  nim: string;
  pageTitle?: string;
  pageDescription?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  classNames,
  name,
  nim,
  pageTitle,
  pageDescription,
}) => {
  const isMobile = useIsMobile();
  return (
    <header
      className={cn(
        "w-full h-16 flex items-center justify-between px-6 bg-white border-b-2 border-black",
        classNames,
      )}
    >
      <div className="flex items-center gap-4">
        <SidebarTrigger className="hidden md:flex border-2 border-black rounded-none hover:bg-[#FF3000] hover:text-white transition-colors duration-200 w-8 h-8 items-center justify-center" />
        {/* Mobile brand mark (no sidebar on mobile) */}
        <div className="md:hidden w-8 h-8 bg-black flex items-center justify-center flex-shrink-0">
          <CalendarSync className="w-4 h-4 text-white" />
        </div>
        {/* Page Title */}
        {pageTitle && pageDescription && (
          <div className="flex flex-col border-l-2 border-black pl-4">
            <h2 className="font-black text-sm uppercase tracking-widest text-black leading-none">
              {pageTitle}
            </h2>
            <span className="text-xs text-[#555555] font-medium mt-0.5">
              {pageDescription}
            </span>
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-3 cursor-pointer select-none group">
            {!isMobile && (
              <div className="flex text-sm flex-col justify-center items-end">
                <span className="font-bold text-black uppercase tracking-widest text-xs">
                  {name}
                </span>
                <span className="text-xs font-black text-[#555555]">{nim}</span>
              </div>
            )}
            <Avatar className="border-2 border-black rounded-none transition-colors duration-200 group-hover:bg-[#FF3000]">
              <AvatarFallback className="rounded-none bg-black text-white font-black text-base group-hover:bg-[#FF3000]">
                {name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown size={16} className="text-black" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 rounded-none border-2 border-black bg-white"
          align="end"
        >
          <LogoutMenu />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default AppHeader;
