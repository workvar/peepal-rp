"use client";

import { Shield, Clock } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogDivider, DialogBody,
  DialogFooter, DialogField,
} from "@/components/ui/dialog";
import { PermissionPanel } from "./permissions";
import type { AdminsPageState } from "./useAdminsPage";

// Create-admin dialog with account details and permission picker.
export function CreateAdminDialog({ page }: { page: AdminsPageState }) {
  const {
    isCreateOpen, setIsCreateOpen, creating,
    form, setForm, formPerms, setFormPerms, errors, setErrors,
    handleCreate,
  } = page;

  return (
    <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setErrors({}); } }}>
      <DialogContent size="lg" accent="violet" onClose={() => { setIsCreateOpen(false); setErrors({}); }}>
        <DialogHeader icon={<Shield size={18} style={{ color: "#1f5d36" }} />}>
          <DialogTitle>Add Super Admin</DialogTitle>
          <DialogDescription>
            Create a new platform administrator account with custom access permissions.
          </DialogDescription>
        </DialogHeader>
        <DialogDivider />

        <form onSubmit={handleCreate}>
          <DialogBody>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Account details */}
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Account Details
                </p>

                <DialogField label="Full Name" required error={errors.name}>
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Smith"
                  />
                </DialogField>

                <DialogField label="Email Address" required error={errors.email}>
                  <input
                    type="email"
                    className="input-field"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@platform.com"
                  />
                </DialogField>

                <DialogField label="Password" required error={errors.password}>
                  <input
                    type="password"
                    className="input-field"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 8 characters"
                  />
                </DialogField>

                <div
                  className="p-3 rounded-2xl text-xs text-muted-foreground"
                  style={{ background: "rgba(31,93,54,0.06)", border: "1px solid rgba(31,93,54,0.15)" }}
                >
                  <Clock size={11} className="inline mr-1.5 opacity-70" />
                  This account will only have the permissions you select on the right.
                  You can update them at any time from the admin table.
                </div>
              </div>

              {/* Right: Permissions */}
              <div>
                <PermissionPanel selected={formPerms} onChange={setFormPerms} />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <button
              type="button"
              onClick={() => { setIsCreateOpen(false); setErrors({}); }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</>
              ) : "Create Admin"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit-profile dialog: rename an admin and optionally set a new password.
export function EditProfileDialog({ page }: { page: AdminsPageState }) {
  const {
    editProfileOpen, setEditProfileOpen,
    editProfileData, setEditProfileData,
    editProfileErrors, setEditProfileErrors,
    savingProfile, handleSaveProfile,
  } = page;

  return (
    <Dialog open={editProfileOpen} onOpenChange={(open) => { if (!open) { setEditProfileOpen(false); setEditProfileErrors({}); } }}>
      <DialogContent size="md" accent="violet" onClose={() => { setEditProfileOpen(false); setEditProfileErrors({}); }}>
        <DialogHeader icon={<Shield size={18} style={{ color: "#1f5d36" }} />}>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update the admin's name and optionally change their password.
          </DialogDescription>
        </DialogHeader>
        <DialogDivider />

        <form onSubmit={handleSaveProfile}>
          <DialogBody>
            <div className="space-y-4">
              <DialogField label="Full Name" required error={editProfileErrors.name}>
                <input
                  className="input-field"
                  value={editProfileData.name}
                  onChange={(e) => setEditProfileData({ ...editProfileData, name: e.target.value })}
                  placeholder="Jane Smith"
                />
              </DialogField>

              <DialogField label="New Password (optional)" error={editProfileErrors.password}>
                <input
                  type="password"
                  className="input-field"
                  value={editProfileData.password}
                  onChange={(e) => setEditProfileData({ ...editProfileData, password: e.target.value })}
                  placeholder="Leave blank to keep current password"
                />
              </DialogField>

              <div
                className="p-3 rounded-2xl text-xs text-muted-foreground"
                style={{ background: "rgba(31,93,54,0.06)", border: "1px solid rgba(31,93,54,0.15)" }}
              >
                <Clock size={11} className="inline mr-1.5 opacity-70" />
                If you set a new password, it must be at least 8 characters.
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <button
              type="button"
              onClick={() => { setEditProfileOpen(false); setEditProfileErrors({}); }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={savingProfile} className="btn-primary">
              {savingProfile ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              ) : "Save Changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
