"use client";

import Switch from "@/components/ui/switch";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Shield } from "lucide-react";
import { ALL_PERMISSIONS, parsePerms, PermissionPanel } from "./permissions";
import type { AdminsPageState } from "./useAdminsPage";

// Admins table with inline permission editing and active toggle.
export default function AdminsTable({ page }: { page: AdminsPageState }) {
  const {
    admins, loading,
    editingId, setEditingId, editPerms, setEditPerms, savingPerms,
    startEditPerms, savePerms, openEditProfile, handleToggleActive,
  } = page;

  return (
    <div className="card p-0 overflow-hidden">
      {loading ? (
        <LoadingSpinner text="Loading admins…" />
      ) : admins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield size={36} className="text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No super admins found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Admin</th>
                <th className="table-th">Permissions</th>
                <th className="table-th">Active</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const perms = parsePerms(admin.permissions);
                const isEditing = editingId === admin.id;
                return (
                  <tr key={admin.id} className="table-row">
                    {/* Admin info */}
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold"
                          style={{ background: "var(--color-category-violet)" }}
                        >
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{admin.name}</p>
                          <p className="text-xs text-muted-foreground">{admin.email}</p>
                        </div>
                        <button
                          onClick={() => openEditProfile(admin)}
                          title="Edit profile"
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline shrink-0"
                        >
                          Edit
                        </button>
                      </div>
                    </td>

                    {/* Permissions */}
                    <td className="table-td">
                      {isEditing ? (
                        <div className="py-2 space-y-3">
                          <PermissionPanel selected={editPerms} onChange={setEditPerms} />
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => savePerms(admin.id)}
                              disabled={savingPerms}
                              className="btn-primary btn-sm"
                            >
                              {savingPerms ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn-secondary btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex flex-wrap gap-1.5 cursor-pointer group"
                          onClick={() => startEditPerms(admin)}
                          title="Click to edit permissions"
                        >
                          {perms.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              No permissions — click to add
                            </span>
                          ) : (
                            perms.map((k) => {
                              const p = ALL_PERMISSIONS.find((x) => x.key === k);
                              return (
                                <span key={k} className="badge badge-primary text-[10px]">
                                  {p?.label ?? k}
                                </span>
                              );
                            })
                          )}
                          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1">
                            edit ✎
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="table-td">
                      <Switch
                        checked={admin.is_active}
                        onChange={() => handleToggleActive(admin)}
                        size="sm"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
