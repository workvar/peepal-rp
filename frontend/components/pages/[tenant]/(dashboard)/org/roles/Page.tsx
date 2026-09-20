"use client";

import PageHeader from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Plus, Lock, Pencil, Trash2, ShieldCheck } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useQuery } from "@apollo/client";
import { groupAccent, getPermLabel, parsePerms } from "./permissions";
import { GET_SYSTEM_ROLES } from "@/graphql/queries/org";
import { useRolesPage } from "./useRolesPage";
import { CreateRoleModal, EditRoleModal } from "./RoleModals";

interface GqlSystemRole {
  id: string; roleId: string; label: string; description: string; color: string; sortOrder: number;
}

export default function RolesPage() {
  const page = useRolesPage();
  const { data: sysData } = useQuery(GET_SYSTEM_ROLES);
  const systemRoles: GqlSystemRole[] = sysData?.systemRoles ?? [];
  const {
    roles, loading,
    setIsCreateOpen, search, setSearch,
    setSelected, confirmState, setConfirmState,
    form, openEdit, handleDelete,
  } = page;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Configure what each role can access within your organisation"
        actions={
          <button
            onClick={() => { form.reset(); setSelected([]); setIsCreateOpen(true); }}
            className="btn-primary"
          >
            <Plus size={17} />
            Create Role
          </button>
        }
      />

      {/* ── System Roles ─────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="section-title flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary-500" />
          System Roles
          <span className="text-xs font-normal text-muted-foreground/70 dark:text-slate-500 ml-1">(read-only)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemRoles.map((role) => (
            <div key={role.id} className={`rounded-xl border p-4 ${groupAccent[role.color]}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{role.label}</span>
                <Lock size={13} className="opacity-50" />
              </div>
              <p className="text-xs opacity-70 leading-relaxed">{role.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Custom Roles ─────────────────────────────────────── */}
      <section>
        <h2 className="section-title">Custom Roles</h2>

        <div className="mb-4">
          <input
            className="input-field w-full"
            placeholder="Search custom roles…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading && !roles.length ? (
          <LoadingSpinner text="Loading roles…" />
        ) : roles.length === 0 ? (
          <div className="card text-center py-12">
            <ShieldCheck size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-muted-foreground text-sm">No custom roles yet.</p>
            <p className="text-muted-foreground/70 dark:text-slate-500 text-xs mt-1">
              Create a role above to assign fine-grained permissions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(search ? roles.filter(r => String(r.name ?? '').toLowerCase().includes(search.toLowerCase())) : roles).map((role) => {
              const perms = parsePerms(role.permissions);
              const labels = perms.map(getPermLabel);

              return (
                <div key={role.id} className="card group hover:shadow-md dark:hover:shadow-slate-900/40 transition-shadow duration-200">
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{role.name}</h3>
                      <p className="text-xs text-muted-foreground/70 dark:text-slate-500 mt-0.5">
                        {perms.length} permission{perms.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(role.id)}
                        className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-slate-700 text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(role.id, role.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Permissions */}
                  {labels.length === 0 ? (
                    <p className="text-xs text-muted-foreground/70 dark:text-slate-500 italic">No permissions assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {labels.slice(0, 6).map((label) => (
                        <Badge key={label} label={label} variant="blue" />
                      ))}
                      {labels.length > 6 && (
                        <Badge label={`+${labels.length - 6} more`} variant="gray" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <CreateRoleModal page={page} />
      <EditRoleModal page={page} />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
