"use client";

import Reveal from "@/components/marketing/primitives/Reveal";

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  accent?: string;
};

/**
 * Generic hero for info pages (About, Mission, Privacy, Terms, Inspiration).
 */
export default function InfoHero({ eyebrow, title, subtitle, accent = "#1f5d36" }: Props) {
  return (
    <section className="relative bg-[#fafaf9] pt-32 md:pt-40">
      <div className="mx-auto max-w-5xl px-6 pb-16 md:px-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
          {eyebrow}
        </p>
        <Reveal>
          <h1 className="mt-4 max-w-4xl text-5xl font-extrabold leading-[1.04] tracking-[-0.025em] text-[#0a0a09] md:text-display-2">
            {title}
          </h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.05}>
            <p className="mt-6 max-w-2xl text-[17px] leading-[1.6] text-[#3a3a37] md:text-[19px]">
              {subtitle}
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
