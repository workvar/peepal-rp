import BrochureHeader from "./BrochureHeader";
import BrochureGrid from "./BrochureGrid";
import type { BrochureContent } from "@/lib/brochure/content";

// Page 3: feature deep dives (header + module grid + footer).
export default function BrochureFeatures({
  features,
  modules,
}: {
  features: BrochureContent["features"];
  modules: BrochureContent["modules"];
}) {
  return (
    <section className="brochure-sheet bg-white">
      <BrochureHeader title={features.title} subhead={features.subhead} />
      <BrochureGrid modules={modules} />
      <footer className="px-10 pb-10 text-right md:px-14">
        <p className="text-sm font-medium text-[#4f9268]">{features.footer}</p>
      </footer>
    </section>
  );
}
