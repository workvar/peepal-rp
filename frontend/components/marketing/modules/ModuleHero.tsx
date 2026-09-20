"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Reveal from "@/components/marketing/primitives/Reveal";
import { Button } from "@/components/ui/button";
import type { ModuleDef } from "@/lib/marketing/modules";

export default function ModuleHero({ module: m }: { module: ModuleDef }) {
  return (
    <section className="relative bg-[#fafaf9] pt-32 md:pt-40">
      <div className="mx-auto w-full max-w-6xl px-6 pb-12 md:px-10">
        <Link
          href="/modules"
          className="inline-flex items-center gap-1 text-[13px] text-[#737370] transition-colors hover:text-[#0a0a09]"
        >
          <ArrowLeft size={14} /> All modules
        </Link>

        <div
          className="mt-8 flex h-14 w-14 items-center justify-center rounded-xl"
          style={{ background: m.gradient }}
        >
          <m.icon size={24} className="text-white" />
        </div>

        <Reveal>
          <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-[-0.025em] text-[#0a0a09] md:text-display-2">
            {m.name}
          </h1>
        </Reveal>

        <p
          className="mt-5 text-[19px] font-semibold md:text-[22px]"
          style={{ color: m.color }}
        >
          {m.tagline}
        </p>

        <Reveal delay={0.05}>
          <p className="mt-6 max-w-2xl text-[17px] leading-[1.6] text-[#3a3a37] md:text-[19px]">
            {m.summary}
          </p>
        </Reveal>

        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Link href="/login">
            <Button variant="default" size="lg" className="px-8">
              Sign in to use it <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/modules">
            <Button variant="outline" size="lg" className="px-8">
              Browse other modules
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
