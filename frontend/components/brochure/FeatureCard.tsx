import { iconFor } from "@/lib/brochure/icons";
import type { ModuleItem } from "@/lib/brochure/content";

// A horizontal module card: icon tile on the left, name + tagline on the right.
export default function FeatureCard({ module }: { module: ModuleItem }) {
  const Icon = iconFor(module.icon);
  return (
    <div className="brochure-card flex items-center gap-4 rounded-xl border border-[#e2ece5] bg-white p-4 transition-colors hover:border-[#88c798] hover:bg-[#f7faf8]">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f0f5f1]">
        <Icon size={24} strokeWidth={1.75} className="text-[#1f5d36]" />
      </div>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold leading-tight text-[#163f25]">
          {module.name}
        </h3>
        <p className="mt-0.5 text-[13px] italic text-[#5b7a66]">
          {module.tagline}
        </p>
      </div>
    </div>
  );
}
