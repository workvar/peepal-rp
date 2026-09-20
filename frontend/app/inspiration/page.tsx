"use client";

import { Lightbulb, Quote, Sparkles } from "lucide-react";
import MarketingShell from "@/components/marketing/layout/MarketingShell";
import InfoHero from "@/components/marketing/sections/InfoHero";
import Reveal from "@/components/marketing/primitives/Reveal";
import ClosingCTA from "@/components/marketing/sections/ClosingCTA";

const INSPIRATIONS = [
  {
    title: "Apple's attention to the small stuff.",
    body: "Typography, motion, spacing — every detail has been thought about. We chase that bar because the people using our software every day deserve it.",
  },
  {
    title: "Linear's speed as a feature.",
    body: "Linear proved that operational software can be fast and beautiful. Keyboard-first, instant transitions, no spinners. We aim to be to ERPs what Linear is to issue trackers.",
  },
  {
    title: "Notion's composability.",
    body: "Notion's success taught us that flexible building blocks beat rigid templates. Peepal's module system is inspired by that idea — every org configures what they need.",
  },
  {
    title: "Stripe's documentation culture.",
    body: "Stripe made developers love an API. We want admins and teachers to love an ERP the same way — through clarity, examples, and respect for their time.",
  },
];

const STORIES = [
  {
    quote: "I used to spend the entire first week of the month on payroll. Now it's a 40-minute check.",
    role: "HR Lead, a 400-employee polytechnic",
  },
  {
    quote: "Attendance used to be four spreadsheets and two WhatsApp groups. Now it's one click per class.",
    role: "Teacher, primary school",
  },
  {
    quote: "Reports that took us two days to prepare are now exports from the dashboard.",
    role: "Finance Manager, training institute",
  },
];

export default function InspirationPage() {
  return (
    <MarketingShell>
      <InfoHero
        eyebrow="Inspiration"
        title="What shaped Peepal."
        subtitle="Every design decision in Peepal borrows from people and products we admire. Here's what we've been thinking about — and the stories from the field that keep us honest."
      />

      <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <Lightbulb size={18} className="text-[#1f5d36]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
              The spark
            </p>
          </div>
          <Reveal>
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
              Born from frustration.
            </h2>
          </Reveal>
          <div className="mt-6 space-y-5 text-[17px] leading-[1.6] text-[#3a3a37]">
            <p>
              Peepal started with a single observation: nobody inside a school
              or college enjoys the ERP they&apos;re forced to use. It&apos;s slow.
              It&apos;s ugly. It breaks at the worst possible moments. Reports take
              days. Exports don&apos;t work. Permissions are an afterthought.
            </p>
            <p>
              We spent time sitting with admins, teachers and finance staff and
              watched what they were actually doing. Then we went home and
              rebuilt the whole thing — the right way.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
              Products that raised the bar
            </p>
            <Reveal>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
                Shoulders of giants.
              </h2>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {INSPIRATIONS.map((it, i) => (
              <Reveal key={it.title} delay={0.05 * i}>
                <div className="rounded-2xl border border-[#e7e7e3] bg-white p-8">
                  <Sparkles size={16} className="text-[#1f5d36]" />
                  <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.005em] text-[#0a0a09]">{it.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.55] text-[#737370]">
                    {it.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fafaf9] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
            Stories from the field
          </p>
          <Reveal>
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-[44px] md:leading-[1.1]">
              Why we build it this way.
            </h2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            {STORIES.map((s, i) => (
              <Reveal key={i} delay={0.05 * i}>
                <div className="rounded-2xl border border-[#e7e7e3] bg-white p-8">
                  <Quote size={16} className="text-[#1f5d36]" />
                  <p className="mt-4 text-[17px] font-semibold leading-[1.4] text-[#0a0a09]">
                    &ldquo;{s.quote}&rdquo;
                  </p>
                  <p className="mt-4 text-[13px] text-[#737370]">{s.role}</p>
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
