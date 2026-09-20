"use client";

import Reveal from "@/components/marketing/primitives/Reveal";

export default function Manifesto() {
  return (
    <section className="bg-[#fafaf9] px-6 py-32 md:px-10">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <p className="font-sans text-3xl font-semibold leading-[1.25] tracking-[-0.005em] text-[#0a0a09] md:text-[44px] md:leading-[1.18]">
            Most institutes run on six tools and a thousand spreadsheets.{" "}
            <span className="text-[#1f5d36]">Peepal replaces all of them</span>{" "}
            with a single workspace where attendance, payroll, marks, leaves and
            reports finally talk to each other — and to you.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
