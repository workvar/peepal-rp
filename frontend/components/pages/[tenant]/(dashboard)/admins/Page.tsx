"use client";

// Minimal admin-account manager. Teachers, staff and students are created from
// the Employees / Students pages (each creates its own login account in one
// step), so this page only handles the small set of admin logins.

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_USERS } from "@/graphql/queries/employees";
import {
  CREATE_USER,
  UPDATE_USER,
  DELETE_USER,
  DEACTIVATE_USER,
} from "@/graphql/mutations/employees";
import { RESEND_INVITE } from "@/graphql/mutations/email";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import UserSessionsPanel from "@/components/sessions/UserSessionsPanel";
import Switch from "@/components/ui/switch";
import { TableSkeleton } from "@/components/ui/skeletons";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import QueryError from "@/components/ui/QueryError";
import Can from "@/components/access/Can";
import InvitePasswordField, { invitePasswordPayload } from "@/components/ui/InvitePasswordField";
import WorkspaceRolesField from "@/components/access/WorkspaceRolesField";
import { useWorkspaceRoles } from "@/lib/hooks/useWorkspaceRoles";
import { useEmailSendStatus } from "@/lib/useEmailSendStatus";
import { useAppSelector } from "@/store/hooks";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { Plus, Edit2, Trash2, Mail } from "lucide-react";

type GqlUser = { id: string; name: string; email: string; role: string; isActive: boolean };

const emptyForm = { name: "", email: "", password: "" };

export default function AdminsPage() {
  const { data, loading, error, refetch } = useQuery(LIST_USERS, {
    fetchPolicy: "cache-and-network",
  });
  const [createUser] = useMutation(CREATE_USER);
  const [updateUser] = useMutation(UPDATE_USER);
  const [deleteUser] = useMutation(DELETE_USER);
  const [deactivateUser] = useMutation(DEACTIVATE_USER);
  const [resendInvite] = useMutation(RESEND_INVITE);
  const { status: emailStatus } = useEmailSendStatus();

  const currentUserId = useAppSelector((s) => s.auth.user?.id);

  const admins = useMemo(
    () => ((data?.users ?? []) as GqlUser[]).filter((u) => u.role === "admin"),
    [data]
  );

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tempOpen, setTempOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [search, setSearch] = useState("");

  // Extra workspaces this admin can switch into (e.g. an admin who also
  // teaches). Loads for the user being edited; saved after the account exists.
  const workspaceRoles = useWorkspaceRoles(editing?.id ?? null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setTempOpen(false);
    workspaceRoles.reset();
    setShowModal(true);
  }

  function openEdit(u: GqlUser) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "" });
    setTempOpen(false);
    setShowModal(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        const input: { name: string; email: string; role: string; password?: string } = {
          name: form.name,
          email: form.email,
          role: "admin",
        };
        if (form.password) input.password = form.password;
        await updateUser({ variables: { id: editing.id, input } });
        await workspaceRoles.save(editing.id);
        toast.success("Admin updated");
      } else {
        const pay = invitePasswordPayload({
          canSendEmail: emailStatus.canSend,
          tempOpen,
          password: form.password,
        });
        const res = await createUser({
          variables: {
            input: { name: form.name, email: form.email, role: "admin", ...pay },
          },
        });
        // Workspace grants need the new account's id, so they are saved once
        // the user exists rather than being part of the create input.
        await workspaceRoles.save(res.data?.createUser?.id ?? null);
        toast.success(pay.sendInvite ? "Admin created — invite email sent" : "Admin created");
      }
      setShowModal(false);
      void refetch();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save admin"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = (u: GqlUser) => {
    if (!u.isActive) return;
    setConfirmState({
      title: "Deactivate Admin",
      message: `Deactivate ${u.name}? They will be signed out of every device immediately and won't be able to log in until re-activated.`,
      variant: "warning",
      confirmLabel: "Deactivate",
      onConfirm: async () => {
        await deactivateUser({ variables: { id: u.id } });
        void refetch();
        toast.success("Admin deactivated");
      },
    });
  };

  const handleResendInvite = async (u: GqlUser) => {
    if (!u.email) {
      toast.error("This admin has no email to send an invite to");
      return;
    }
    try {
      const res = await resendInvite({ variables: { userId: u.id } });
      const r = res.data?.resendInvite;
      if (r?.sent) {
        toast.success(`Invite email sent to ${u.email}`);
      } else if (r?.link) {
        await navigator.clipboard?.writeText(r.link).catch(() => {});
        toast.success("Email not configured — invite link copied to clipboard");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to send invite"));
    }
  };

  const handleDelete = (u: GqlUser) => {
    if (u.id === currentUserId) {
      toast.error("You cannot delete your own account");
      return;
    }
    setConfirmState({
      title: "Delete Admin",
      message: `Permanently delete ${u.name}? This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteUser({ variables: { id: u.id } });
          void refetch();
          toast.success("Admin deleted");
        } catch (err: unknown) {
          toast.error(getErrorMessage(err, "Failed to delete admin"));
        }
      },
    });
  };

  const filtered = admins.filter((u) =>
    [u.name, u.email].some((v) => v.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <PageHeader
        title="Admins"
        subtitle="Manage administrator accounts"
        actions={
          <Can module="admins" action="create">
            <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
              <Plus size={16} /> New Admin
            </button>
          </Can>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <input
          className="input-field flex-1"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          <span className="font-medium text-foreground">{admins.length}</span>{" "}
          {admins.length === 1 ? "admin" : "admins"}
        </span>
      </div>

      {error && <QueryError message={error.message} onRetry={() => void refetch()} />}

      {loading && admins.length === 0 ? (
        <TableSkeleton columns={["Name", "Email", "Active", ""]} rows={4} colWidths={["w-40", "w-56", "w-16", "w-16"]} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Active</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u.id} className="table-row">
                  <td className="table-td font-medium text-foreground">{u.name}</td>
                  <td className="table-td text-muted-foreground">{u.email || "—"}</td>
                  <td className="table-td">
                    <Can module="admins" action="edit">
                      <Switch checked={u.isActive} onChange={() => handleToggleActive(u)} size="sm" />
                    </Can>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      {u.email && (
                        <Can module="admins" action="edit">
                          <button
                            onClick={() => handleResendInvite(u)}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Send password-setup invite"
                          >
                            <Mail size={16} />
                          </button>
                        </Can>
                      )}
                      <Can module="admins" action="edit">
                        <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800" title="Edit admin">
                          <Edit2 size={16} />
                        </button>
                      </Can>
                      <Can module="admins" action="delete">
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={u.id === currentUserId}
                          className="text-red-600 hover:text-red-800 disabled:text-muted-foreground disabled:cursor-not-allowed"
                          title={u.id === currentUserId ? "You cannot delete your own account" : "Delete admin"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="table-td text-center text-muted-foreground/70 py-8">
                    No admins found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />

      <Modal title={editing ? "Edit Admin" : "New Admin"} isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Full Name</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@example.org"
              required
            />
          </div>
          <InvitePasswordField
            canSendEmail={emailStatus.canSend}
            email={form.email}
            password={form.password}
            onPasswordChange={(v) => setForm({ ...form, password: v })}
            tempOpen={tempOpen}
            onTempOpenChange={setTempOpen}
            editing={!!editing}
          />
          <WorkspaceRolesField
            primaryRole="admin"
            selected={workspaceRoles.roles}
            onToggle={workspaceRoles.toggle}
            disabled={submitting}
          />
          {/* Only when editing: a user being created has nowhere to be signed
              in yet. Outside the form element's flow, since signing out is an
              immediate action rather than something the Save button applies. */}
          {editing && (
            <div className="pt-2 border-t border-border">
              <UserSessionsPanel userId={editing.id} userName={editing.name} />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (editing ? "Updating..." : "Creating...") : editing ? "Update Admin" : "Create Admin"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
