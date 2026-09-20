"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Code2, Users as UsersIcon, BookOpen, Sparkles } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

/** Index page for /docs — bridges users into either the dev or user guide. */
export default function DocsHome() {
  const params = useParams();
  const tenant = params.tenant as string;

  const cards = [
    {
      href: `/${tenant}/docs/users`,
      icon: UsersIcon,
      title: "User Guide",
      blurb:
        "How to use every feature in Peepal, login, creating users, attendance, marks, leaves, approvals and more. Written for admins, teachers, students and staff.",
      cta: "Open User Guide",
      tint: "from-blue-500/15 to-indigo-500/5 border-blue-500/30",
    },
    {
      href: `/${tenant}/docs/dev`,
      icon: Code2,
      title: "Developer Docs",
      blurb:
        "Architecture, repo layout, data model, request lifecycle, multi-tenancy, approval engine, dev workflow and deployment. Diagrams, charts and flow visuals included.",
      cta: "Open Dev Docs",
      tint: "from-violet-500/15 to-fuchsia-500/5 border-violet-500/30",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Documentation"
        subtitle="Everything you need to use, extend and understand Peepal."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className={`group rounded-2xl border bg-gradient-to-br ${c.tint} p-6 hover:shadow-lg transition-all`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-background/80 border border-border flex items-center justify-center">
                  <Icon size={20} className="text-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{c.title}</h3>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                {c.blurb}
              </p>
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                {c.cta} <ArrowRight size={14} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-3">
        <Sparkles size={18} className="text-primary mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-bold text-foreground mb-1">
            New to Peepal?
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Start with the <Link href={`/${tenant}/docs/users`} className="text-primary font-semibold underline-offset-2 hover:underline">User Guide → Getting Started</Link>{" "}
            section. Admins should follow the &ldquo;First-day checklist&rdquo;
            to get the institute set up in under 30 minutes.
          </p>
        </div>
      </div>

      <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
        <BookOpen size={14} />
        Looking for a specific module? Use the left rail or jump straight into{" "}
        <Link href={`/${tenant}/dashboard`} className="underline">the dashboard</Link>.
      </div>
    </div>
  );
}
