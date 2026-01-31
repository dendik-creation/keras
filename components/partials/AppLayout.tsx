"use client";
import { ReactNode, useEffect, useState } from "react";
import AppHeader from "@/components/partials/AppHeader";
import AppSidebar from "@/components/partials/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getLocalStorage } from "@/helper/local_storage";

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
  pageTitleHeader?: string;
  pageDescriptionHeader?: string;
}

export default function AppLayout({
  children,
  className,
  pageDescriptionHeader,
  pageTitleHeader,
}: AppLayoutProps) {
  const [activeUser, setActiveUser] = useState<{
    name: string;
    nim: string;
    major: string;
    degree: string;
  }>({
    name: "...",
    nim: "...",
    major: "...",
    degree: "...",
  });

  useEffect(() => {
    const user = getLocalStorage("active_user");
    if (user && user.name && user.nim) {
      setActiveUser(user);
    }
  }, []);

  return (
    <SidebarProvider>
      <div className={`flex min-h-screen w-full ${className}`}>
        <AppSidebar />
        <div className="flex flex-col w-full">
          <AppHeader
            name={activeUser.name}
            nim={`${activeUser.degree} ${activeUser.major} - ${activeUser.nim}`}
            pageTitle={pageTitleHeader}
            pageDescription={pageDescriptionHeader}
          />
          <main className="flex-1 p-4 bg-gray-50 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
