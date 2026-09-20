"use client";

import { Shield } from "lucide-react";
import Reveal from "@/components/marketing/primitives/Reveal";
import type { ModuleDef } from "@/lib/marketing/modules";

export default function WhoCanUse({ module: m }: { module: ModuleDef }) {
  return (
    <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center gap-3">
          <Shield size={16} style={{ color: m.color }} />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: m.color }}>
            Who can use this
          </p>
        </div>

        <Reveal>
          <h2 className="max-w-3xl text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
            Role-aware, by design.
          </h2>
        </Reveal>

        <p className="mt-4 max-w-2xl text-[17px] leading-[1.6] text-[#3a3a37]">
          Peepal&apos;s role-based access control means every user gets only what
          they need — no leaks, no surprises.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
          {m.whoCanUse.map((w, i) => (
            <Reveal key={w.role} delay={0.04 * i}>
              <div className="flex gap-4 rounded-2xl border border-[#e7e7e3] bg-white p-6">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: m.gradient }}
                >
                  {w.role.charAt(0)}
                </div>
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.005em] text-[#0a0a09]">{w.role}</p>
                  <p className="mt-1 text-[14px] leading-[1.55] text-[#737370]">
                    {w.why}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
