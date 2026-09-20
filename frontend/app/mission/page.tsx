"use client";

import { Compass, Flag, Heart, Telescope } from "lucide-react";
import MarketingShell from "@/components/marketing/layout/MarketingShell";
import InfoHero from "@/components/marketing/sections/InfoHero";
import Reveal from "@/components/marketing/primitives/Reveal";
import ClosingCTA from "@/components/marketing/sections/ClosingCTA";

const PILLARS = [
  {
    icon: Compass,
    title: "Clarity",
    body: "Every workflow should have one obvious next step. We design for less thinking, more doing.",
  },
  {
    icon: Flag,
    title: "Ownership",
    body: "Admins own their institution. Teachers own their classes. Students own their profiles. Everyone owns their data.",
  },
  {
    icon: Heart,
    title: "Care",
    body: "Institutions carry a lot of responsibility. Our software should carry some of it — not add to the pile.",
  },
  {
    icon: Telescope,
    title: "Foresight",
    body: "Build for the next five years, not the last ten. Multi-tenant, typed APIs, role-based from day one.",
  },
];

export default function MissionPage() {
  return (
    <MarketingShell>
      <InfoHero
        eyebrow="Mission"
        title="Give every institution software that respects their people."
        subtitle="For too long, the software running schools, colleges and training institutes has been clunky, slow and designed for procurement teams — not the people who actually use it every day."
      />

      <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-4xl">
              Our mission.
            </h2>
          </Reveal>

          <div className="mt-6 space-y-6 text-[17px] leading-[1.6] text-[#3a3a37]">
            <p>
              Peepal exists to make the operational backbone of every
              institution — admissions, academics, attendance, payroll, fees, and
              everything in between — feel modern, fast and trustworthy.
            </p>
            <p>
              We believe software that runs organisations should feel as
              considered as the software you use on your phone. We believe
              role-based access shouldn&apos;t be a premium tier. We believe reports
              shouldn&apos;t be a consulting project.
            </p>
            <p>
              Every decision we make — in design, in architecture, in pricing —
              follows from this:{" "}
              <span className="font-semibold text-[#0a0a09]">
                the people who use the system every day should love using it.
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
              Our pillars
            </p>
            <Reveal>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
                Four commitments we won&apos;t compromise on.
              </h2>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={0.05 * i}>
                <div className="rounded-2xl border border-[#e7e7e3] bg-white p-8 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#b9d6c2]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f5f1]">
                    <p.icon size={20} className="text-[#1f5d36]" />
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.005em] text-[#0a0a09]">{p.title}</h3>
                  <p className="mt-3 text-[14px] leading-[1.55] text-[#737370]">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
            Long-term vision
          </p>
          <Reveal>
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
              One platform for every organisation that teaches.
            </h2>
          </Reveal>
          <p className="mt-6 text-[17px] leading-[1.6] text-[#3a3a37]">
            We start with educational institutions because that&apos;s where the
            problem is worst. But the same building blocks — people,
            operations, finance, reporting — apply to corporate L&amp;D, healthcare
            training and non-profits. The long-term goal is a single platform
            that shapes itself to the organisation using it.
          </p>
        </div>
      </section>

      <ClosingCTA />
    </MarketingShell>
  );
}
