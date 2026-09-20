"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@apollo/client";
import { ASSIGN_USER_MANAGER } from "@/graphql/mutations/org";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { UserCog, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import { ancestorIds, descendantIds, directReportIds } from "./relationships";

export interface OrgUserFlat {
  id: string;
  name: string;
  email: string;
  role: string;
  managerId?: string | null;
  designation?: string | null;
}

// Admin-only panel for editing a person's reporting line: pick their manager
// and add/remove their direct reports. Both actions funnel through the existing
// assignUserManager mutation (it sets the *child's* manager_id either way).
//
// The selected user is passed in whole (with their current managerId from the
// tree) so the panel always renders on selection — it never depends on the
// person also being present in the separately-loaded `orgUsers` list.
export default function ManageHierarchy({
  user,
  orgUsers,
  onChanged,
}: {
  user: { id: string; name: string; managerId?: string | null };
  orgUsers: OrgUserFlat[];
  onChanged: () => Promise<void> | void;
}) {
  const [assignManager] = useMutation(ASSIGN_USER_MANAGER);
  const [busy, setBusy] = useState(false);

  const userId = user.id;
  // Prefer the live value from orgUsers once it's loaded; otherwise use the
  // manager the tree already gave us. (When present, orgUsers is authoritative,
  // even when the manager was just cleared to null.)
  const selfFromOrg = orgUsers.find((u) => u.id === userId);
  const currentManagerId = selfFromOrg ? selfFromOrg.managerId ?? "" : user.managerId ?? "";
  const byId = useMemo(() => new Map(orgUsers.map((u) => [u.id, u])), [orgUsers]);

  // Managers can't be the person themselves or anyone who reports up to them.
  const managerOptions = useMemo(() => {
    const blocked = descendantIds(orgUsers, userId);
    return orgUsers
      .filter((u) => u.id !== userId && !blocked.has(u.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((u) => ({ value: u.id, label: u.name, sublabel: u.designation || u.email || u.role }));
  }, [orgUsers, userId]);

  const reports = useMemo(
    () => directReportIds(orgUsers, userId).map((id) => byId.get(id)!).filter(Boolean),
    [orgUsers, userId, byId],
  );

  // Reportees can't be the person themselves, an existing direct report, or
  // anyone the person already reports up to (which would create a cycle).
  const reporteeOptions = useMemo(() => {
    const blocked = ancestorIds(orgUsers, userId);
    const existing = new Set(reports.map((r) => r.id));
    return orgUsers
      .filter((u) => u.id !== userId && !blocked.has(u.id) && !existing.has(u.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((u) => ({ value: u.id, label: u.name, sublabel: u.designation || u.email || u.role }));
  }, [orgUsers, userId, reports]);

  async function setManagerOf(childId: string, managerId: string | null, message: string) {
    setBusy(true);
    try {
      await assignManager({ variables: { userId: childId, managerId } });
      await onChanged();
      toast.success(message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save the change");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4 space-y-5">
      <div className="flex items-center gap-2">
        <UserCog size={15} className="text-primary" />
        <p className="text-sm font-semibold text-foreground">Manage reporting line</p>
      </div>

      {/* Reporting manager */}
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Reporting manager
        </label>
        <SearchableSelect
          options={[{ value: "", label: "— No manager —" }, ...managerOptions]}
          value={currentManagerId}
          onChange={(v) =>
            setManagerOf(userId, v || null, v ? "Manager assigned" : "Manager cleared")
          }
          disabled={busy}
          placeholder="— No manager —"
          searchPlaceholder="Search people…"
        />
      </div>

      {/* Direct reports */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-muted-foreground" />
          <label className="text-xs uppercase tracking-wide text-muted-foreground">
            Direct reports ({reports.length})
          </label>
        </div>

        {reports.length > 0 && (
          <div className="space-y-1">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-1.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.designation || r.role}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setManagerOf(r.id, null, "Reportee removed")}
                  className="text-muted-foreground hover:text-red-600 disabled:opacity-50 shrink-0"
                  title="Remove from reports"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <SearchableSelect
          options={reporteeOptions}
          value=""
          onChange={(v) => v && setManagerOf(v, userId, "Reportee added")}
          disabled={busy || reporteeOptions.length === 0}
          placeholder="Add a reportee…"
          searchPlaceholder="Search people…"
        />
      </div>
    </div>
  );
}
