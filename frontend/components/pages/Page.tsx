"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import MarketingShell from "@/components/marketing/layout/MarketingShell";
import Hero from "@/components/marketing/sections/Hero";
import Manifesto from "@/components/marketing/sections/Manifesto";
import ModulesGrid from "@/components/marketing/sections/ModulesGrid";
import ModuleDeepDive from "@/components/marketing/sections/ModuleDeepDive";
import ITPanel from "@/components/marketing/sections/ITPanel";
import ClosingCTA from "@/components/marketing/sections/ClosingCTA";

function useRedirectIfAuthed() {
  const router = useRouter();
  const { hasSession, tenantSlug } = useAppSelector((s) => s.auth);
  useEffect(() => {
    if (!hasSession) return;
    const slug =
      tenantSlug ||
      (typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : null);
    router.replace(slug ? `/${slug}/dashboard` : "/login");
  }, [hasSession, tenantSlug, router]);
}

export default function LandingPage() {
  useRedirectIfAuthed();

  return (
    <MarketingShell>
      <Hero />
      <Manifesto />
      <ModulesGrid />
      <ModuleDeepDive
        side="right"
        eyebrow="Attendance"
        heading="Never chase a register again."
        body="Bulk marking, period-wise slots and live shortage alerts — attendance that keeps up with how classes really happen."
        bullets={[
          "Mark a whole class in one tap, edit in line",
          "Live shortage tracking per student, per course",
          "Bridges to payroll for staff attendance",
        ]}
        screenshotSrc="/marketing/screenshots/attendance.png"
        screenshotAlt="Peepal attendance — bulk-mark UI for a class"
        screenshotUrl="peepal.app/attendance"
      />
      <ModuleDeepDive
        side="left"
        eyebrow="Payroll"
        heading="Payroll that just runs."
        body="Salary structures, attendance-aware payruns, branded payslips at scale. Statutory reports in one click."
        bullets={[
          "Component-based salary structures",
          "Bulk payslip release with your branding",
          "Attendance, leaves and overtime, factored automatically",
        ]}
        screenshotSrc="/marketing/screenshots/payroll.png"
        screenshotAlt="Peepal payroll — payrun list with detail drawer"
        screenshotUrl="peepal.app/payroll"
      />
      <ModuleDeepDive
        side="right"
        eyebrow="Reports"
        heading="Decisions, not spreadsheets."
        body="Live dashboards and role-aware reports across every module. Exports anywhere. No data team required."
        bullets={[
          "Every module ships dashboards on day one",
          "Role-aware — each user sees their numbers, no manual filtering",
          "CSV / PDF on every table, one click",
        ]}
        screenshotSrc="/marketing/screenshots/reports.png"
        screenshotAlt="Peepal dashboard — KPI tiles and trend charts"
        screenshotUrl="peepal.app/reports"
      />
      <ITPanel />
      <ClosingCTA />
    </MarketingShell>
  );
}
