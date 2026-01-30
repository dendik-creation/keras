"use client";
import { ReactNode } from "react";
import AppHeader from "@/components/partials/AppHeader";
import AppSidebar from "@/components/partials/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getLocalStorage } from "@/helper/local_storage";

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}
export default function AppLayout({ children, className }: AppLayoutProps) {
  const activeUser = getLocalStorage("active_user") || {
    name: "Guest",
    nim: "00000000",
  };
  return (
    <SidebarProvider>
      <div className={`flex min-h-screen w-full ${className}`}>
        <AppSidebar />
        <div className="flex flex-col w-full">
          <AppHeader name={activeUser.name} nim={activeUser.nim} />
          <main className="flex-1 p-4 bg-gray-50 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
