"use client";

import Header from "@/components/layout/Header";
import AskPanel from "@/components/peepalai/AskPanel";

export default function AskPeepalAIPage() {
  return (
    <div className="max-w-4xl">
      <Header
        title="Ask PeepalAI"
        subtitle="Ask questions about your data in plain language — answers come only from records you have permission to see"
      />
      <AskPanel />
    </div>
  );
}
