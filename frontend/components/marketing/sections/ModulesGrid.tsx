"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/marketing/primitives/Reveal";
import { MODULES } from "@/lib/marketing/modules";

export default function ModulesGrid() {
  return (
    <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
            Every module
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-3 text-display-3 font-extrabold tracking-[-0.02em] text-[#0a0a09]">
            Built for every role.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-4 max-w-xl text-[17px] leading-[1.55] text-[#3a3a37]">
            From the front desk to finance — nine modules, one system.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <ul className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/modules/${m.slug}`}
                  className="group relative flex h-full flex-col gap-3 rounded-xl border border-[#e7e7e3] bg-white p-6 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#b9d6c2] hover:bg-[#f0f5f1]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0f5f1] text-[#1f5d36] transition-colors group-hover:bg-[#dcebe0]">
                      <m.icon size={18} />
                    </span>
                    <ArrowUpRight
                      size={16}
                      className="text-[#737370] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#1f5d36]"
                    />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold tracking-[-0.005em] text-[#0a0a09]">
                      {m.name}
                    </h3>
                    <p className="mt-1 text-[13px] leading-[1.5] text-[#737370]">
                      {m.tagline}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
