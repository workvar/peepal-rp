import Script from "next/script";
import { CLARITY_ENABLED, CLARITY_PROJECT_ID } from "@/lib/analytics/clarity";

/**
 * Injects the Microsoft Clarity tag. Rendered once from the root layout.
 * If no project ID resolves (see lib/analytics/clarity.ts), this returns
 * null and we ship nothing.
 *
 * Strategy "afterInteractive" defers the network fetch until the page is
 * interactive, so the tag never competes with hydration for the main thread.
 */
export default function Clarity() {
  if (!CLARITY_ENABLED) return null;
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
      `}
    </Script>
  );
}
