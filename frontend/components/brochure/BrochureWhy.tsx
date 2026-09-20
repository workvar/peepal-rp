import Image from "next/image";
import type { BrochureContent } from "@/lib/brochure/content";

// Page 2: positioning + the pillars + Why Choose.
export default function BrochureWhy({ why }: { why: BrochureContent["why"] }) {
  return (
    <section className="brochure-sheet min-h-screen bg-white">
      <div className="bg-[#20512a] px-10 pb-12 pt-14 text-white md:px-16 md:pt-16">
        <h2 className="max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] md:text-5xl">
          {why.title}
        </h2>
        <p className="mt-4 max-w-xl text-lg italic leading-snug text-[#a9d3b6] md:text-xl">
          {why.subhead}
        </p>

        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          {why.pillars.map((p) => (
            <div key={p.title} className="relative pt-5">
              <span className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-[#88c798]" />
              <span className="absolute left-1.5 top-[5px] hidden h-px w-full bg-[#3a6b48] md:block" />
              <h3 className="text-[13px] font-bold text-white">{p.title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-[#a9d3b6]">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-10 py-12 md:px-16">
        <h2 className="text-2xl font-bold text-[#20512a] md:text-3xl">
          {why.whyTitle}
        </h2>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[#3a3a37]">
          {why.whyParagraph}
        </p>

        <div className="relative mt-8 h-64 w-full overflow-hidden rounded-2xl md:h-80">
          <Image
            src="/brochure/campus.png"
            alt="Aerial view of a campus"
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
