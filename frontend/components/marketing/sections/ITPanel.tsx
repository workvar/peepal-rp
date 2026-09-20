"use client";

import Reveal from "@/components/marketing/primitives/Reveal";

const PILLARS = [
  {
    title: "Roles & permissions",
    body: "27+ scopes. Role-based access end-to-end.",
  },
  {
    title: "Data ownership",
    body: "Export anything. CSV/PDF baked into every screen.",
  },
  {
    title: "Audit & access",
    body: "Every action logged. One tenant per institute.",
  },
] as const;

export default function ITPanel() {
  return (
    <section className="bg-[#fafaf9] px-6 py-20 md:px-10">
      <div className="mx-auto max-w-6xl rounded-3xl bg-[#0a0a09] px-8 py-20 md:px-16 md:py-24">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#93c2a0]">
            For IT &amp; operations
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-[-0.02em] text-[#fafaf9] md:text-[56px] md:leading-[1.05]">
            Built for the people who actually run it.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-[17px] leading-[1.6] text-[#a1a1aa]">
            Peepal is multi-tenant, role-based and audit-friendly — so the team
            running the institute can sleep at night.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-14 grid grid-cols-1 gap-10 border-t border-[#27272a] pt-10 md:grid-cols-3 md:gap-12">
            {PILLARS.map((p) => (
              <div key={p.title}>
                <h3 className="text-[17px] font-semibold tracking-[-0.005em] text-[#fafaf9]">
                  {p.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.55] text-[#a1a1aa]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
