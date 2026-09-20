"use client";

import { substituteVars } from "@/lib/emailTemplate";

// Renders the email HTML with sample variables substituted, inside a sandboxed
// iframe (no scripts) so the preview can't run anything or escape its box.
export default function TemplatePreview({
  html,
  vars,
}: {
  html: string;
  vars: Record<string, string>;
}) {
  return (
    <iframe
      title="Email preview"
      className="w-full min-h-[420px] rounded-lg border border-border bg-white"
      srcDoc={substituteVars(html, vars)}
      sandbox=""
    />
  );
}
