"use client";

import Reveal from "@/components/marketing/primitives/Reveal";
import BrowserFrame from "@/components/marketing/primitives/BrowserFrame";

export interface ModuleDeepDiveProps {
  side: "left" | "right";
  eyebrow: string;
  heading: string;
  body: string;
  bullets: [string, string, string];
  screenshotSrc: string;
  screenshotAlt: string;
  screenshotUrl?: string;
}

export default function ModuleDeepDive({
  side,
  eyebrow,
  heading,
  body,
  bullets,
  screenshotSrc,
  screenshotAlt,
  screenshotUrl,
}: ModuleDeepDiveProps) {
  const copyOrder = side === "right" ? "lg:order-1" : "lg:order-2";
  const shotOrder = side === "right" ? "lg:order-2" : "lg:order-1";

  return (
    <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal className={copyOrder}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
            {eyebrow}
          </p>
          <h3 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
            {heading}
          </h3>
          <p className="mt-5 max-w-md text-[17px] leading-[1.6] text-[#3a3a37]">
            {body}
          </p>
          <ul className="mt-7 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[15px] leading-[1.5] text-[#0a0a09]">
                <span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-[#1f5d36]" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className={shotOrder}>
          <BrowserFrame
            src={screenshotSrc}
            alt={screenshotAlt}
            url={screenshotUrl}
            tilt={side === "right" ? -1 : 1}
            shadow="lg"
          />
        </Reveal>
      </div>
    </section>
  );
}
