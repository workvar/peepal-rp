"use client";

import { Users, Shield, Zap, Globe, HeartHandshake, Target } from "lucide-react";
import MarketingShell from "@/components/marketing/layout/MarketingShell";
import InfoHero from "@/components/marketing/sections/InfoHero";
import Reveal from "@/components/marketing/primitives/Reveal";
import ClosingCTA from "@/components/marketing/sections/ClosingCTA";

const VALUES = [
  { icon: Zap,           title: "Speed matters",     body: "Every interaction should feel instant. Slow software steals days back from your team." },
  { icon: Shield,        title: "Safety by default", body: "Role-based access, encryption and audit trails — not as add-ons, but as the baseline." },
  { icon: HeartHandshake,title: "Built with users",  body: "We ship the features you actually need, not the ones that look good in a brochure." },
  { icon: Globe,         title: "Open to scale",     body: "Multi-tenant from day one — run an institute or a network of them, same system." },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <InfoHero
        eyebrow="About Peepal"
        title="The ERP that respects your time."
        subtitle="Peepal started as a simple idea: the software that runs a school, college or training institute should feel as good as the apps you use at home."
      />

      <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
              What is Peepal?
            </p>
            <Reveal>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
                One system, every workflow.
              </h2>
            </Reveal>
            <p className="mt-6 text-[17px] leading-[1.6] text-[#3a3a37]">
              Peepal is a modern, cloud-native ERP for education and beyond.
              Students, employees, attendance, marks, leaves, payroll, fees,
              reports and announcements — all connected, all role-aware, all fast.
            </p>
            <p className="mt-4 text-[17px] leading-[1.6] text-[#3a3a37]">
              It&apos;s built on a Go + Next.js stack with GraphQL and role-based
              access control, so it scales from a single institute to a network
              of them.
            </p>
          </div>

          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-[#e7e7e3] bg-white p-10">
              <div className="flex items-center gap-3">
                <Target size={20} className="text-[#1f5d36]" />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
                  What we replace
                </p>
              </div>
              <ul className="mt-6 space-y-3 text-[15px] leading-[1.5] text-[#0a0a09]">
                <li className="flex items-start gap-3"><span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-[#1f5d36]" />The old ERP nobody wants to open.</li>
                <li className="flex items-start gap-3"><span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-[#1f5d36]" />The patchwork of spreadsheets.</li>
                <li className="flex items-start gap-3"><span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-[#1f5d36]" />The WhatsApp groups for announcements.</li>
                <li className="flex items-start gap-3"><span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-[#1f5d36]" />The Excel-based attendance register.</li>
                <li className="flex items-start gap-3"><span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-[#1f5d36]" />The manual payroll that takes a week.</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">Values</p>
            <Reveal>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
                What we care about.
              </h2>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={0.05 * i}>
                <div className="rounded-2xl border border-[#e7e7e3] bg-white p-8 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#b9d6c2]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f5f1]">
                    <v.icon size={20} className="text-[#1f5d36]" />
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.005em] text-[#0a0a09]">{v.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.55] text-[#737370]">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
            Who it&apos;s for
          </p>
          <Reveal>
            <h2 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
              Schools, colleges, training institutes and beyond.
            </h2>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              { title: "Schools & colleges",     body: "The flagship. Full academic workflows — students, staff, classes, fees, exams." },
              { title: "Coaching & training",    body: "Batches, fees, attendance and announcements — lightweight and fast." },
              { title: "Multi-branch networks",  body: "Multi-tenant from the ground up. One platform, many institutes." },
            ].map((w, i) => (
              <Reveal key={w.title} delay={0.05 * i}>
                <div className="rounded-2xl border border-[#e7e7e3] bg-white p-7">
                  <Users size={18} className="text-[#1f5d36]" />
                  <h3 className="mt-4 text-[17px] font-semibold text-[#0a0a09]">{w.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.55] text-[#737370]">{w.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ClosingCTA />
    </MarketingShell>
  );
}
