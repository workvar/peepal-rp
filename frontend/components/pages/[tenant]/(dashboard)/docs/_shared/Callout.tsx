"use client";

import { Info, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";

type Variant = "info" | "warn" | "success" | "tip";

const styles: Record<Variant, { bg: string; border: string; text: string; icon: React.ElementType }> = {
  info:    { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-700 dark:text-blue-300",     icon: Info },
  warn:    { bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-700 dark:text-amber-300",   icon: AlertTriangle },
  success: { bg: "bg-emerald-500/10",border: "border-emerald-500/30",text: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  tip:     { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-700 dark:text-violet-300", icon: Lightbulb },
};

interface Props {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
}

/** Coloured callout box for tips, warnings and key notes inside docs. */
export default function Callout({ variant = "info", title, children }: Props) {
  const s = styles[variant];
  const Icon = s.icon;
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-4 flex gap-3`}>
      <Icon className={`shrink-0 mt-0.5 ${s.text}`} size={18} />
      <div className="flex-1">
        {title && <div className={`text-sm font-bold mb-1 ${s.text}`}>{title}</div>}
        <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
