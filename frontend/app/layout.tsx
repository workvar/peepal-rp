import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Providers from "@/components/layout/Providers";
import Analytics from "@/components/analytics/Analytics";
import Clarity from "@/components/analytics/Clarity";
import PageViewTracker from "@/components/analytics/PageViewTracker";

export const metadata: Metadata = {
  title: "Peepal — One platform. Every workflow.",
  description: "Peepal is a modern, fast, all-in-one ERP for running your entire organisation — people, operations, finance, reports and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Analytics />
        <Clarity />
        {/* PageViewTracker uses useSearchParams, which Next requires
            to live inside a Suspense boundary at the layout level. */}
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
