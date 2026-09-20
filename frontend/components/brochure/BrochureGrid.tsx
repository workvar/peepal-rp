import FeatureCard from "./FeatureCard";
import type { ModuleItem } from "@/lib/brochure/content";

// Grid of every module, rendered from content.
export default function BrochureGrid({ modules }: { modules: ModuleItem[] }) {
  return (
    <section className="px-8 py-12 md:px-14">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <FeatureCard key={m.name} module={m} />
        ))}
      </div>
    </section>
  );
}
