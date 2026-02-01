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
        "w-full h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm",
        classNames,
      )}
    >
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        {/*Page Title in Header*/}
        {pageTitle && pageDescription && (
          <div className="flex flex-col">
            <h2 className="font-semibold text-md">{pageTitle}</h2>
            <span className="text-sm text-slate-700">{pageDescription}</span>
          </div>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-3 cursor-pointer select-none">
            {!isMobile && (
              <div className="flex text-sm flex-col justify-center items-end">
                <span className="">{name}</span>
                <span className="text-xs font-semibold">{nim}</span>
              </div>
            )}
            <Avatar className="border-2 border-solid transition-all border-violet-500">
              <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <ChevronDown size={16} />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <LogoutMenu />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default AppHeader;
