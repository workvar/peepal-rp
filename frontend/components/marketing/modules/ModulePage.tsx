import MarketingShell from "@/components/marketing/layout/MarketingShell";
import ClosingCTA from "@/components/marketing/sections/ClosingCTA";
import ModuleHero from "./ModuleHero";
import ModuleFeatures from "./ModuleFeatures";
import WhoCanUse from "./WhoCanUse";
import ModuleHighlights from "./ModuleHighlights";
import type { ModuleDef } from "@/lib/marketing/modules";

export default function ModulePage({ module: m }: { module: ModuleDef }) {
  return (
    <MarketingShell>
      <ModuleHero module={m} />
      <ModuleFeatures module={m} />
      <ModuleHighlights module={m} />
      <WhoCanUse module={m} />
      <ClosingCTA />
    </MarketingShell>
  );
}
