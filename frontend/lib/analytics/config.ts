/**
 * GA4 configuration. The measurement ID is read from a public env var
 * so the Next.js build can inline it. If unset, the analytics layer
 * silently no-ops — useful for local dev and CI without polluting your
 * GA property with junk events.
 */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export const ANALYTICS_ENABLED = GA_MEASUREMENT_ID.startsWith("G-");
