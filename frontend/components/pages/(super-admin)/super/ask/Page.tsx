"use client";

// Super-admin Ask PeepalAI — same panel, but the platform super admin queries
// across all tenants (the backend recognises the role and skips tenant scoping).

import PageHeader from "@/components/ui/PageHeader";
import AskPanel from "@/components/peepalai/AskPanel";

export default function SuperAskPeepalAIPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Ask PeepalAI"
        subtitle="Natural-language questions across the whole platform"
      />
      <AskPanel />
    </div>
  );
}
