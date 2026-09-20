"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MarketingShell from "@/components/marketing/layout/MarketingShell";
import Reveal from "@/components/marketing/primitives/Reveal";
import ClosingCTA from "@/components/marketing/sections/ClosingCTA";
import { MODULES } from "@/lib/marketing/modules";
import { trackModuleCardClick } from "@/lib/analytics/events";

export default function ModulesIndex() {
  return (
    <MarketingShell>
      <section className="bg-[#fafaf9] pt-32 md:pt-40">
        <div className="mx-auto max-w-6xl px-6 pb-12 md:px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
            Every module
          </p>
          <Reveal>
            <h1 className="mt-4 max-w-4xl text-5xl font-extrabold leading-[1.04] tracking-[-0.025em] text-[#0a0a09] md:text-display-2">
              Nine modules. One platform.
            </h1>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-6 max-w-2xl text-[17px] leading-[1.6] text-[#3a3a37] md:text-[19px]">
              Peepal covers every workflow your organisation runs on — from
              the front desk to the finance team. Click any module to learn more.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#fafaf9] px-6 pb-20 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m, i) => (
              <Reveal key={m.slug} delay={0.04 * i}>
                <Link
                  href={`/modules/${m.slug}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#e7e7e3] bg-white p-7 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#b9d6c2] hover:bg-[#f0f5f1]"
                  onClick={() =>
                    trackModuleCardClick({
                      location: "modules_directory",
                      item_id: m.slug,
                      item_name: m.name,
                      link_url: `/modules/${m.slug}`,
                    })
                  }
                >
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: m.gradient }}
                  >
                    <m.icon size={20} className="text-white" />
                  </div>
                  <h3 className="text-[19px] font-bold tracking-[-0.005em] text-[#0a0a09]">{m.name}</h3>
                  <p className="mt-1 text-[13px] font-semibold" style={{ color: m.color }}>
                    {m.tagline}
                  </p>
                  <p className="mt-3 text-[14px] leading-[1.55] text-[#737370]">
                    {m.summary}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#0a0a09]">
                    Learn more
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ClosingCTA />
    </MarketingShell>
  );
}
