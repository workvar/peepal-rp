"use client";

import ModulePage from "@/components/marketing/modules/ModulePage";
import { getModule } from "@/lib/marketing/modules";
import { notFound } from "next/navigation";

export default function Page() {
  const m = getModule("payroll");
  if (!m) notFound();
  return <ModulePage module={m} />;
}