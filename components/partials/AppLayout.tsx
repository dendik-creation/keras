"use client";
import { ReactNode, useEffect, useState } from "react";
import AppHeader from "@/components/partials/AppHeader";
import AppSidebar from "@/components/partials/AppSidebar";
import BottomNav from "@/components/partials/BottomNav";
import OnboardingController from "@/components/onboarding/OnboardingController";
import { getLocalStorage } from "@/helper/local_storage";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

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
    avatarUrl: null as string | null,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = getLocalStorage("active_user");
      if (stored) {
        setUser(typeof stored === "string" ? JSON.parse(stored) : stored);
      }
    } catch (e) {}
  }, []);

  return (
    <div className={`flex min-h-screen w-full ${className}`}>
      {/* Sidebar: desktop only — mobile uses the bottom nav */}
      <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="flex flex-col w-full h-screen overflow-hidden">
        <AppHeader
          name={user.name}
          nim={`${user.degree || ""} ${user.major || ""} - ${user.nim}`}
          avatarUrl={user.avatarUrl}
          pageTitle={pageTitleHeader}
          pageDescription={pageDescriptionHeader}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 pb-24 md:pb-4 bg-[#F2F2F2] swiss-grid-pattern overflow-y-auto">
          {children}
          <Analytics />
          <SpeedInsights />
        </main>
      </div>
      <BottomNav />
      <OnboardingController />
    </div>
  );
}
