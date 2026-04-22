"use client";
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChevronDown } from "lucide-react";
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
        "w-full h-16 flex items-center justify-between px-6 bg-[#F0F0F0] border-b-4 border-[#121212]",
        classNames,
      )}
    >
      <div className="flex items-center gap-4">
        <SidebarTrigger className="border-2 border-[#121212] rounded-none hover:bg-[#F0C020] hover:text-[#121212] transition-colors w-8 h-8 flex items-center justify-center" />
        {/* Page Title */}
        {pageTitle && pageDescription && (
          <div className="flex flex-col border-l-4 border-[#121212] pl-4">
            <h2 className="font-black text-sm uppercase tracking-wide text-[#121212] leading-none">
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
                <span className="font-bold text-[#121212] uppercase tracking-wide text-xs">
                  {name}
                </span>
                <span className="text-xs font-black text-[#555555]">{nim}</span>
              </div>
            )}
            <Avatar className="border-4 border-[#121212] rounded-none transition-all shadow-[3px_3px_0px_0px_#121212] group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px]">
              <AvatarFallback className="rounded-none bg-[#D02020] text-white font-black text-base">
                {name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown size={16} className="text-[#121212]" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 rounded-none border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] bg-white"
          align="end"
        >
          <LogoutMenu />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default AppHeader;
