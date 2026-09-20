"use client";

import Reveal from "@/components/marketing/primitives/Reveal";
import type { ModuleDef } from "@/lib/marketing/modules";

export default function ModuleFeatures({ module: m }: { module: ModuleDef }) {
  return (
    <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: m.color }}>
            What you get
          </p>
          <Reveal>
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
              Capabilities built in.
            </h2>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {m.features.map((f, i) => (
            <Reveal key={f.title} delay={0.05 * i}>
              <div className="rounded-2xl border border-[#e7e7e3] bg-white p-8 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#b9d6c2]">
                <h3 className="text-[17px] font-semibold tracking-[-0.005em] text-[#0a0a09]">{f.title}</h3>
                <p className="mt-3 text-[14px] leading-[1.55] text-[#737370]">
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
