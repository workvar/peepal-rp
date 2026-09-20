import { ANALYTICS_ENABLED, GA_MEASUREMENT_ID } from "./config";
import type { GA4EventName } from "./types";

/**
 * Window-level gtag types. We intentionally keep the typing loose because
 * GA4's surface accepts dozens of overloads; tightening it here would
 * fight every event we add.
 */
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Low-level gtag dispatch. Safe to call before the script loads — gtag
 * itself is a thin shim around dataLayer.push, which we initialise in
 * Analytics.tsx. */
export function gtag(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  // GA's recommended pattern: push raw arguments object onto dataLayer.
  // The official snippet does the same.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

/** Typed event dispatcher. Always go through this so the GA4EventName
 * registry stays authoritative. */
export function sendEvent(name: GA4EventName, params: object = {}): void {
  if (!ANALYTICS_ENABLED) {
    if (process.env.NODE_ENV === "development") {
      // Surface events in the browser console during dev so you can
      // verify wiring without a real GA property.
      // eslint-disable-next-line no-console
      console.debug("[ga4]", name, params);
    }
    return;
  }
  gtag("event", name, params);
}

/** Fire a manual page_view. Used by PageViewTracker on App Router
 * client-side navigations (gtag's automatic page_view only fires on
 * the initial config call). */
export function sendPageView(pagePath: string, pageTitle?: string): void {
  if (!ANALYTICS_ENABLED) return;
  gtag("event", "page_view", {
    page_path: pagePath,
    page_title: pageTitle,
    send_to: GA_MEASUREMENT_ID,
  });
}
