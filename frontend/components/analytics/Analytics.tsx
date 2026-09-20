import Script from "next/script";
import { ANALYTICS_ENABLED, GA_MEASUREMENT_ID } from "@/lib/analytics/config";

/**
 * Mounts the gtag.js loader and bootstraps the dataLayer. Rendered
 * once from the root layout. If NEXT_PUBLIC_GA_MEASUREMENT_ID is
 * unset (local dev, preview), this returns null and we ship nothing.
 *
 * Strategy "afterInteractive" is the GA-recommended setting: defers
 * the network fetch until the page is interactive, so gtag never
 * competes with hydration for the main thread.
 */
export default function Analytics() {
  if (!ANALYTICS_ENABLED) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            // Manual page_views — PageViewTracker fires them on route
            // changes so client-side navigations are counted correctly.
            send_page_view: false,
          });
        `}
      </Script>
    </>
  );
}
