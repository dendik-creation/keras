"use client";
import React, { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Menu, ChevronDown, Lightbulb } from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LogoutMenu from "@/components/custom/LogoutMenu";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppHeaderProps {
  classNames?: string;
  name: string;
  nim: string;
  avatarUrl?: string | null;
  pageTitle?: string;
  pageDescription?: string;
  onMenuClick?: () => void;
}

const avatars = [
  "1.jpg",
  "2.jpg",
  "4.jpg",
  "5.jpg",
  "6.jpg",
]

const AppHeader: React.FC<AppHeaderProps> = ({
  classNames,
  name,
  nim,
  avatarUrl,
  pageTitle,
  pageDescription,
  onMenuClick,
}) => {
  const isMobile = useIsMobile();
  const fallbackAvatar = useMemo(
    () => `/avatar/${avatars[Math.floor(Math.random() * avatars.length)]}`,
    [],
  );
  const avatarSrc = avatarUrl || fallbackAvatar;
  const firstLetterCapitalized = (text: string) => {
    const newText = text.toLowerCase();
    const parts = newText.split(" ");
    return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }
  return (
    <header
      className={cn(
        "w-full h-16 flex items-center justify-between px-3 md:px-6 bg-white border-b-2 border-black shrink-0",
        classNames,
      )}
    >
      <div className="flex items-center gap-2.5 md:gap-4 overflow-hidden">
        <button
          type="button"
          onClick={onMenuClick}
          data-tour-desktop="schedule-sidebar-toggle"
          className="hidden md:flex border-2 border-black rounded-none hover:bg-[#FF3000] hover:text-white transition-colors duration-200 w-8 h-8 items-center justify-center shrink-0"
        >
          <Menu size={16} />
          <span className="sr-only">Toggle Sidebar</span>
        </button>
        {/* Mobile brand mark (no sidebar on mobile) */}
        <Image
          src="/logo.png"
          alt="KeRaS"
          width={28}
          height={28}
          className="md:hidden w-7 h-7 object-contain flex-shrink-0"
        />
        {/* Page Title */}
        {pageTitle && (
          <div data-tour-desktop="schedule-page-title" data-tour-mobile="schedule-page-title" className="flex flex-col border-l-2 border-black pl-2.5 md:pl-4 overflow-hidden">
            <h2 className="font-medium text-xs md:text-sm uppercase tracking-wider text-black leading-none truncate">
              {pageTitle}
            </h2>
            {pageDescription && (
              <span className="text-[10px] md:text-xs text-[#555555] font-normal mt-0.5 truncate">
                {pageDescription}
              </span>
            )}
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-3 cursor-pointer select-none group">
            {!isMobile && (
              <div className="flex text-sm flex-col justify-center items-end">
                <span className="font-bold text-black text-md">
                  {firstLetterCapitalized(name)}
                </span>
                <span className="text-xs font-medium text-[#555555]">{firstLetterCapitalized(nim)}</span>
              </div>
            )}
            <Avatar size="lg" className="border-2 border-black rounded-none transition-colors duration-200 group-hover:bg-[#FF3000]">
              <AvatarImage loading="lazy" src={avatarSrc} alt={name} className="rounded-none object-cover" />
              <AvatarFallback className="rounded-none bg-black text-white font-bold text-base group-hover:bg-[#FF3000]">
                {firstLetterCapitalized(name)?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown size={16} className="text-black" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 rounded-none border-2 border-black bg-white"
          align="end"
        >

          <DropdownMenuItem
            key={"sign-out"}
            className="flex w-full cursor-pointer items-center gap-2"
            onClick={() => window.dispatchEvent(new CustomEvent("keras-restart-tour"))}
          >
            <Lightbulb/>
            <span>Ulangi Panduan (Tour)</span>
          </DropdownMenuItem>
          <LogoutMenu />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default AppHeader;
