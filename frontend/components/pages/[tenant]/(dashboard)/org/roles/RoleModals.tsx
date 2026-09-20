"use client";

import Modal from "@/components/ui/Modal";
import PermissionEditor from "./PermissionEditor";
import type { RolesPageState } from "./useRolesPage";

// Create-role modal.
export function CreateRoleModal({ page }: { page: RolesPageState }) {
  const { isCreateOpen, setIsCreateOpen, form, selected, setSelected, loading, onCreateSubmit } = page;

  return (
    <Modal
      title="Create Custom Role"
      isOpen={isCreateOpen}
      onClose={() => { setIsCreateOpen(false); form.reset(); setSelected([]); }}
      size="lg"
    >
      <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Role Name
          </label>
          <input
            type="text"
            {...form.register("name", { required: true })}
            placeholder="e.g. Department Head, Lab Instructor…"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-3">
            Permissions
            <span className="ml-1 text-xs font-normal text-muted-foreground/70 dark:text-slate-500">
              ({selected.length} selected)
            </span>
          </label>
          <PermissionEditor selected={selected} onChange={setSelected} />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? "Creating…" : "Create Role"}
        </button>
      </form>
    </Modal>
  );
}

// Edit-role modal.
export function EditRoleModal({ page }: { page: RolesPageState }) {
  const { editingId, setEditingId, form, selected, setSelected, loading, onEditSubmit } = page;

  return (
    <Modal
      title="Edit Custom Role"
      isOpen={!!editingId}
      onClose={() => { setEditingId(null); form.reset(); setSelected([]); }}
      size="lg"
    >
      <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Role Name
          </label>
          <input
            type="text"
            {...form.register("name", { required: true })}
            placeholder="e.g. Department Head"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-3">
            Permissions
            <span className="ml-1 text-xs font-normal text-muted-foreground/70 dark:text-slate-500">
              ({selected.length} selected)
            </span>
          </label>
          <PermissionEditor selected={selected} onChange={setSelected} />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? "Updating…" : "Update Role"}
        </button>
      </form>
    </Modal>
  );
}
