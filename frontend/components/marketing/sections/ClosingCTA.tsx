"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/marketing/primitives/Reveal";

export default function ClosingCTA() {
  return (
    <section className="bg-[#fafaf9] px-6 pb-32 pt-24 md:px-10 md:pt-32">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="text-4xl font-extrabold tracking-[-0.02em] text-[#0a0a09] md:text-display-3">
            Run your institute on one operating system.
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.6] text-[#3a3a37]">
            Sign in to your workspace, or ask your administrator to provision an account.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="px-8 text-[15px]">
                Sign in <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/modules">
              <Button variant="outline" size="lg" className="px-8 text-[15px]">
                Explore modules
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
