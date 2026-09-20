/**
 * Microsoft Clarity configuration. The project ID is read from a public
 * env var so the Next.js build can inline it, falling back to the known
 * project ID. If the resolved ID is empty, the Clarity loader no-ops,
 * which keeps local dev and CI from polluting the dashboard.
 */
export const CLARITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "wv75haycfa";

export const CLARITY_ENABLED = CLARITY_PROJECT_ID.length > 0;
