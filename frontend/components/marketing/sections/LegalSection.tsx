"use client";

import Reveal from "@/components/marketing/primitives/Reveal";

type Section = { title: string; body: React.ReactNode };

export default function LegalSection({ sections }: { sections: Section[] }) {
  return (
    <section className="bg-[#fafaf9] px-6 py-20 md:px-10">
      <div className="mx-auto max-w-3xl space-y-12">
        {sections.map((s, i) => (
          <Reveal key={s.title} delay={0.03 * i}>
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-3xl">{s.title}</h2>
              <div className="mt-4 space-y-4 text-[16px] leading-[1.6] text-[#3a3a37]">
                {s.body}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
