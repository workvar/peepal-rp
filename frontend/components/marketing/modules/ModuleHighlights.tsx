"use client";

import { Check } from "lucide-react";
import Reveal from "@/components/marketing/primitives/Reveal";
import type { ModuleDef } from "@/lib/marketing/modules";

export default function ModuleHighlights({ module: m }: { module: ModuleDef }) {
  return (
    <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: m.color }}>
              Highlights
            </p>
            <Reveal>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
                Every detail, thought through.
              </h2>
            </Reveal>
            <p className="mt-6 max-w-md text-[17px] leading-[1.6] text-[#3a3a37]">
              Small things add up. Here are the details we obsessed over so you
              don&apos;t have to.
            </p>
          </div>

          <ul className="space-y-4">
            {m.highlights.map((h, i) => (
              <Reveal key={h} delay={0.05 * i}>
                <li className="flex items-start gap-4 rounded-2xl border border-[#e7e7e3] bg-white p-5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: m.gradient }}
                  >
                    <Check size={16} className="text-white" />
                  </div>
                  <span className="text-[15px] font-medium leading-[1.55] text-[#0a0a09]">{h}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
