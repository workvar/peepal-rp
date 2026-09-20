"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { sendPageView } from "@/lib/analytics/gtag";

/**
 * Fires a `page_view` whenever the App Router route changes. We
 * disable gtag's automatic page_view in Analytics.tsx because
 * Next.js' client-side transitions don't trigger a full document
 * load, so the auto event would only ever fire on hard refreshes.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    const fullPath = qs ? `${pathname}?${qs}` : pathname;
    sendPageView(fullPath, document.title);
  }, [pathname, searchParams]);

  return null;
}
