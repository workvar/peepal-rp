import Image from "next/image";
import type { BrochureContent } from "@/lib/brochure/content";

// Page 1 of the brochure: the cover.
export default function BrochureCover({
  cover,
}: {
  cover: BrochureContent["cover"];
}) {
  return (
    <section className="brochure-sheet flex min-h-screen flex-col bg-[#20512a] px-10 py-12 text-white md:px-16 md:py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#88c798]">
        {cover.label}
      </p>

      <h1 className="mt-8 text-5xl font-extrabold leading-[1.05] tracking-[-0.02em] md:text-7xl">
        {cover.title1}
        <br />
        {cover.title2}
      </h1>

      <div className="relative mt-10 h-44 w-full overflow-hidden rounded-xl md:h-56">
        <Image
          src="/brochure/waves.png"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
        />
      </div>

      <div className="mt-12 max-w-2xl">
        <h2 className="text-2xl font-bold leading-snug md:text-3xl">
          {cover.lead}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-[#bcd9c4]">
          {cover.paragraph}
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between pt-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#88c798]">
          {cover.edition}
        </p>
        <div className="text-right text-[13px] leading-relaxed text-[#bcd9c4]">
          <p>{cover.builtForLine}</p>
          <a
            href={`mailto:${cover.contactEmail}?subject=Peepal%20demo`}
            className="font-semibold text-white underline-offset-2 hover:underline"
          >
            {cover.ctaText}
          </a>
          <p>{cover.contactEmail}</p>
          <p className="mt-1 font-semibold text-[#88c798]">{cover.brand}</p>
        </div>
      </div>
    </section>
  );
}
