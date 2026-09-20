"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { useAccess } from "@/lib/useAccess";
import { useTerminology } from "@/store/hooks/useTerminology";
import { getModules, type CategoryColor } from "@/lib/moduleConfig";

function categoryVar(color: CategoryColor): string {
  return `var(--color-category-${color})`;
}

/**
 * Personalized shortcut tiles for non-admin roles. The full hierarchy lives in
 * the sidebar now; this is just a quick-launch surface on the home screen.
 */
export default function ShortcutsGrid() {
  const { tenantSlug } = useAppSelector((s) => s.auth);
  const { canViewModule } = useAccess();
  const slug =
    tenantSlug ??
    (typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : "") ??
    "";

  const terminology = useTerminology();
  const mods = getModules(slug, terminology)
    .filter(
      (m) =>
        canViewModule(m.id, m.roles) &&
        m.group !== "Administration" &&
        m.group !== "Reports"
    )
    .slice(0, 8);

  if (mods.length === 0) return null;

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Your shortcuts
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {mods.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="group flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card transition-all duration-200 hover:shadow-md"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: categoryVar(mod.color) }}
              >
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{mod.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{mod.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
