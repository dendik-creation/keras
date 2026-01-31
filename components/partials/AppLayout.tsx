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
  const [user, setUser] = useState({
    name: "User",
    nim: "...",
    degree: "",
    major: "",
  });

  useEffect(() => {
    try {
      const stored = getLocalStorage("active_user");
      if (stored) {
        setUser(typeof stored === "string" ? JSON.parse(stored) : stored);
      }
    } catch (e) {}
  }, []);

  return (
    <SidebarProvider>
      <div className={`flex min-h-screen w-full ${className}`}>
        <AppSidebar />
        <div className="flex flex-col w-full h-screen overflow-hidden">
          <AppHeader
            name={user.name}
            nim={`${user.degree || ""} ${user.major || ""} - ${user.nim}`}
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
