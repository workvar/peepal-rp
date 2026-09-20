"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrowserFrame from "@/components/marketing/primitives/BrowserFrame";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#fafaf9] pt-32 md:pt-40">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-6 pb-24 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-20 lg:pb-32">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1f5d36]">
            Peepal · ERP for institutes
          </p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.04] tracking-[-0.025em] text-[#0a0a09] md:text-display-2">
            Run every team.{" "}
            <span className="font-serif italic font-normal text-[#1f5d36]">Every</span>{" "}
            workflow.
          </h1>
          <p className="mt-7 max-w-xl text-[17px] leading-[1.6] text-[#3a3a37] md:text-[19px]">
            Peepal is one workspace for everything an institute runs — students,
            staff, attendance, marks, leaves, payroll and fees, with reports built in.
          </p>

          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link href="/login">
              <Button size="lg" className="px-7 text-[15px]">
                Sign in <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/modules">
              <Button variant="outline" size="lg" className="px-7 text-[15px]">
                Explore modules
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative">
          <BrowserFrame
            src="/marketing/screenshots/dashboard.png"
            alt="Peepal dashboard — KPI summary, recent activity and charts"
            url="peepal.app/dashboard"
            tilt={-1}
            shadow="lg"
            priority
          />
        </div>
      </div>
    </section>
  );
}
