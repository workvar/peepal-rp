"use client";

// FormSection — card-style grouping used inside each employee-form tab.
// Renders a subtle gradient header with an icon + title, and hosts the
// fields in a responsive grid.

import type { LucideIcon } from "lucide-react";

interface FormSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: "violet" | "cyan" | "emerald" | "amber" | "rose" | "slate";
  children: React.ReactNode;
}

const ACCENTS: Record<NonNullable<FormSectionProps["accent"]>, { bg: string; border: string; fg: string }> = {
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  fg: "text-violet-500" },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    fg: "text-cyan-500" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", fg: "text-emerald-500" },
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/20",   fg: "text-amber-500" },
  rose:    { bg: "bg-rose-500/10",    border: "border-rose-500/20",    fg: "text-rose-500" },
  slate:   { bg: "bg-slate-500/10",   border: "border-slate-500/20",   fg: "text-slate-400" },
};

export default function FormSection({
  icon: Icon,
  title,
  description,
  accent = "violet",
  children,
}: FormSectionProps) {
  const a = ACCENTS[accent];
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${a.bg} ${a.border}`}>
          <Icon className={`h-4 w-4 ${a.fg}`} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Thin labelled-input wrapper to cut noise in tab files. */
export function Field({
  label,
  required,
  hint,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
