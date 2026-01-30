"use client";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LogoutMenu from "@/components/custom/LogoutMenu";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppHeaderProps {
  classNames?: string;
  name: string;
  nim: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({ classNames, name, nim }) => {
  const isMobile = useIsMobile();
  return (
    <header
      className={cn(
        "w-full h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-sm",
        classNames,
      )}
    >
      <SidebarTrigger />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-3 cursor-pointer select-none">
            {!isMobile && (
              <div className="flex text-sm flex-col justify-center items-end">
                <span className="">{name}</span>
                <span className="text-xs font-semibold">{nim}</span>
              </div>
            )}
            <Avatar className="border-2 border-solid transition-all border-yellow-500">
              <AvatarImage src="/assets/img/user_icon.png" />
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
