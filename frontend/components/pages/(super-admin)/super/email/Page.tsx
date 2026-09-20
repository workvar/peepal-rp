"use client";

// Super-admin Email: the platform SMTP server plus the template designer for
// every system email.

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import SmtpTab from "./SmtpTab";
import TemplatesTab from "./TemplatesTab";

type Tab = "smtp" | "templates";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-indigo-500 text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function SuperEmailPage() {
  const [tab, setTab] = useState<Tab>("smtp");
  return (
    <div>
      <PageHeader
        title="Email"
        subtitle="Platform SMTP server and the templates used for every system email"
      />
      <div className="flex gap-2 mb-5 border-b border-border">
        <TabButton active={tab === "smtp"} onClick={() => setTab("smtp")}>
          Server (SMTP)
        </TabButton>
        <TabButton active={tab === "templates"} onClick={() => setTab("templates")}>
          Templates
        </TabButton>
      </div>
      {tab === "smtp" ? <SmtpTab /> : <TemplatesTab />}
    </div>
  );
}
