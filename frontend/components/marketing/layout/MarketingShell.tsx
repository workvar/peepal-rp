"use client";

import { useEffect } from "react";
import SmoothScroll from "@/components/marketing/scroll/SmoothScroll";
import MarketingNav from "./MarketingNav";
import MarketingFooter from "./MarketingFooter";
import ScrollDepthTracker from "@/components/analytics/ScrollDepthTracker";

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (had) root.classList.add("dark");
    };
  }, []);

  return (
    <SmoothScroll>
      <ScrollDepthTracker />
      <div className="relative min-h-screen bg-[#fafaf9] text-[#0a0a09] antialiased">
        <MarketingNav />
        <main>{children}</main>
        <MarketingFooter />
      </div>
    </SmoothScroll>
  );
}
