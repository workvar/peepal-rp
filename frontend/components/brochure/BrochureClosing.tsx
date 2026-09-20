import DashField from "./DashField";
import type { BrochureContent } from "@/lib/brochure/content";

// Page 4 of the brochure: the closing call-to-action.
export default function BrochureClosing({
  closing,
}: {
  closing: BrochureContent["closing"];
}) {
  return (
    <section className="brochure-sheet relative flex min-h-screen flex-col overflow-hidden bg-[#20512a] px-10 py-14 text-white md:px-16 md:py-16">
      <h2 className="relative z-10 max-w-2xl text-5xl font-extrabold leading-[1.05] tracking-[-0.02em] md:text-6xl">
        {closing.title}
      </h2>

      <div className="pointer-events-none absolute inset-x-0 top-44 bottom-24 opacity-90">
        <DashField />
      </div>

      <div className="relative z-10 mt-auto flex items-end justify-between pt-12">
        <p className="text-xl font-bold tracking-wide text-[#88c798]">
          {closing.brand}
        </p>
        <div className="text-right">
          <p className="text-[15px] text-[#bcd9c4]">{closing.contactEmail}</p>
          <a
            href={`mailto:${closing.contactEmail}?subject=Peepal%20demo`}
            className="text-[15px] font-semibold text-[#88c798] underline-offset-2 hover:underline"
          >
            {closing.ctaText}
          </a>
        </div>
      </div>
    </section>
  );
}
