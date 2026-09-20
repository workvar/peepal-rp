"use client";

import { useTerminology } from "@/store/hooks/useTerminology";
import { useTenantType } from "@/store/hooks/useTerminology";
import { roleLabel } from "@/lib/roleLabels";
import { workspaceIcon } from "@/lib/workspaces";
import type { Role } from "@/types";

/**
 * "Additional workspaces" picker.
 *
 * Grants a user extra roles they can switch into — e.g. a teacher who is also
 * enrolled as a student, or an admin who also needs the employee workspace.
 * The user's primary role is shown as a locked chip: it is always granted and
 * is changed through the role field above, not here.
 */

/** Roles that can be granted as an extra workspace. Never super_admin. */
const ASSIGNABLE: Role[] = ["admin", "teacher", "staff", "student"];

export default function WorkspaceRolesField({
  primaryRole,
  selected,
  onToggle,
  disabled,
}: {
  primaryRole: Role | null;
  selected: Role[];
  onToggle: (role: Role) => void;
  disabled?: boolean;
}) {
  const terms = useTerminology();
  const tenantType = useTenantType();

  // Patients only exist in healthcare, so the option is hidden elsewhere.
  const options = tenantType === "healthcare" ? [...ASSIGNABLE, "patient" as Role] : ASSIGNABLE;
  const choices = options.filter((r) => r !== primaryRole);

  return (
    <div>
      <label className="block text-sm font-medium text-foreground/80 mb-1">
        Additional workspaces
      </label>
      <p className="text-xs text-muted-foreground mb-2">
        Extra roles this person can switch into from the sidebar. Their own
        permissions apply inside each one.
      </p>

      <div className="flex flex-wrap gap-2">
        {primaryRole && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-muted/40 text-muted-foreground">
            {roleLabel(primaryRole, terms)}
            <span className="text-[10px] uppercase tracking-wide">primary</span>
          </span>
        )}

        {choices.map((role) => {
          const Icon = workspaceIcon(role);
          const on = selected.includes(role);
          return (
            <button
              key={role}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(role)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                on
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              <Icon size={13} />
              {roleLabel(role, terms)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
