"use client";

import { useState } from "react";
import { Lock, RotateCcw, Save, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { useAccessControl } from "./useAccessControl";
import RoleSelector from "./RoleSelector";
import AccessMatrixTable from "./AccessMatrixTable";
import UserRoleAssignment from "./UserRoleAssignment";
import { ACTIONS } from "./accessHelpers";

export default function AccessControlPage() {
  const {
    loading, saving, roles, modules,
    selected, setSelected, selectedRole, isAdmin,
    row, dirty, toggleCell, toggleColumn, toggleRow, save, reset, discard,
  } = useAccessControl();

  const matrixReady = roles.length > 0;
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const askReset = () => {
    if (!selectedRole) return;
    setConfirm({
      title: "Reset to defaults",
      message: `Reset "${selectedRole.label}" back to the built-in default access? Any custom changes for this role will be removed.`,
      variant: "danger",
      confirmLabel: "Reset",
      onConfirm: reset,
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Access Control"
        subtitle="Choose which pages each role can open and what they can do there"
      />

      {loading && !matrixReady ? (
        <LoadingSpinner text="Loading access matrix…" />
      ) : (
        <>
          <section className="mb-5">
            <h2 className="section-title flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary-500" />
              Roles
            </h2>
            <RoleSelector
              roles={roles}
              selected={selected}
              dirtyKey={dirty ? selected : null}
              onSelect={setSelected}
            />
          </section>

          {selectedRole && (
            <section>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {selectedRole.label}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {selectedRole.isCustom ? "Custom role" : "System role"}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAdmin
                      ? "Full access to every module."
                      : "Tick what this role may do in each module."}
                  </p>
                </div>

                {!isAdmin && (
                  <div className="flex items-center gap-2">
                    {dirty && (
                      <button onClick={discard} className="btn-secondary text-sm">
                        Discard
                      </button>
                    )}
                    <button onClick={askReset} className="btn-secondary text-sm">
                      <RotateCcw size={15} />
                      Reset to defaults
                    </button>
                    <button
                      onClick={save}
                      disabled={!dirty || saving}
                      className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={15} />
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                )}
              </div>

              {isAdmin ? (
                <div className="card flex items-center gap-3 text-sm text-muted-foreground">
                  <Lock size={16} className="text-primary-500 shrink-0" />
                  The Admin role always has full access and cannot be restricted.
                </div>
              ) : (
                <>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-xs text-muted-foreground">
                    {ACTIONS.map((a) => (
                      <span key={a.key}>
                        <span className="font-medium text-foreground">{a.label}:</span>{" "}
                        {a.desc}
                      </span>
                    ))}
                  </div>

                  <AccessMatrixTable
                    modules={modules}
                    row={row}
                    disabled={isAdmin}
                    onToggleCell={toggleCell}
                    onToggleColumn={toggleColumn}
                    onToggleRow={toggleRow}
                  />

                  <p className="text-xs text-muted-foreground/70 mt-3">
                    Changes take effect on the user&apos;s next page load. Turning off
                    <span className="font-medium"> View</span> hides the page from the
                    sidebar and blocks its URL.
                  </p>
                </>
              )}
            </section>
          )}

          <UserRoleAssignment />
        </>
      )}

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
