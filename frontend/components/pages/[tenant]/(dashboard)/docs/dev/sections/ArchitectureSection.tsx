"use client";

import DocSection from "../../_shared/DocSection";
import ArchitectureDiagram from "../../diagrams/ArchitectureDiagram";
import RequestLifecycle from "../../diagrams/RequestLifecycle";

export default function ArchitectureSection() {
  return (
    <DocSection
      id="architecture"
      title="Architecture"
      description="Three tiers: a React client, a thin Next.js shell, and a Go API that owns all business logic. There is no server-side rendering of business data — Next.js is used purely as a router and bundler."
    >
      <ArchitectureDiagram />
      <RequestLifecycle />
    </DocSection>
  );
}
