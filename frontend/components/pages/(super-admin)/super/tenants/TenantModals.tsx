"use client";

import Modal from "@/components/ui/Modal";
import InvitePasswordField from "@/components/ui/InvitePasswordField";
import { AlertTriangle } from "lucide-react";
import type { TenantsPageState } from "./useTenantsPage";

// Edit tenant name / timezone / currency.
export function EditTenantModal({ s }: { s: TenantsPageState }) {
  const { isEditModalOpen, setIsEditModalOpen, editFormData, setEditFormData, editLoading } = s;
  return (
    <Modal
      title="Edit Tenant Details"
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      size="md"
    >
      <form onSubmit={s.handleEditSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Name
          </label>
          <input
            type="text"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            placeholder="Organization name"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Timezone
          </label>
          <select
            value={editFormData.timezone}
            onChange={(e) => setEditFormData({ ...editFormData, timezone: e.target.value })}
            className="input-field"
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Chicago">America/Chicago (CST)</option>
            <option value="America/Denver">America/Denver (MST)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Europe/Paris">Europe/Paris (CET)</option>
            <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Currency
          </label>
          <select
            value={editFormData.currency}
            onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value })}
            className="input-field"
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="AUD">AUD (A$)</option>
            <option value="CAD">CAD (C$)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="CNY">CNY (¥)</option>
          </select>
        </div>

        <label className="flex items-start gap-2 text-sm text-foreground/90 rounded-lg border border-border p-3">
          <input
            type="checkbox"
            checked={editFormData.email_sending_allowed}
            onChange={(e) =>
              setEditFormData({ ...editFormData, email_sending_allowed: e.target.checked })
            }
            className="mt-0.5 rounded border-border"
          />
          <span>
            Allow this organisation to send emails
            <span className="block text-xs text-muted-foreground">
              Controls whether the org can send password-setup invites and notifications.
            </span>
          </span>
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(false)}
            className="flex-1 border border-border rounded-lg py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={editLoading}
            className="flex-1 btn-primary text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {editLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Create a new tenant plus its primary admin account.
export function CreateTenantModal({ s }: { s: TenantsPageState }) {
  const {
    isCreateModalOpen, setIsCreateModalOpen, register, handleSubmit, reset, loading,
    watch, setValue, tempOpen, setTempOpen,
  } = s;
  return (
    <Modal
      title="Create New Tenant"
      isOpen={isCreateModalOpen}
      onClose={() => {
        setIsCreateModalOpen(false);
        reset();
      }}
      size="md"
    >
      <form onSubmit={handleSubmit(s.onCreateSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Organization Name
          </label>
          <input
            type="text"
            {...register("name", { required: true })}
            placeholder="E.g., Oxford University"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Organization Type
          </label>
          <select {...register("type")} className="input-field">
            <option value="education">Education (school / college / training)</option>
            <option value="corporate">Corporate (company)</option>
            <option value="healthcare">Healthcare (hospital / clinic)</option>
            <option value="nonprofit">Non-profit / NGO</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Determines default modules, role labels (e.g. Students vs. Employees
            vs. Patients), and onboarding copy for this tenant.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Subdomain
          </label>
          <input
            type="text"
            {...register("subdomain", { required: true })}
            placeholder="e.g., oxford"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Admin Name
          </label>
          <input
            type="text"
            {...register("admin_name", { required: true })}
            placeholder="John Doe"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Admin Email
          </label>
          <input
            type="email"
            {...register("admin_email", { required: true })}
            placeholder="admin@example.com"
            className="input-field"
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-foreground/90 rounded-lg border border-border p-3">
          <input
            type="checkbox"
            {...register("email_sending_allowed")}
            className="mt-0.5 rounded border-border"
          />
          <span>
            Allow this organisation to send emails
            <span className="block text-xs text-muted-foreground">
              Enables emailed password-setup invites and notifications. The admin
              below can be invited by email instead of given a password.
            </span>
          </span>
        </label>

        <InvitePasswordField
          label="Admin Password"
          canSendEmail={!!watch("email_sending_allowed")}
          email={watch("admin_email")}
          password={watch("admin_password") || ""}
          onPasswordChange={(v) => setValue("admin_password", v)}
          tempOpen={tempOpen}
          onTempOpenChange={setTempOpen}
        />

        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-sm font-medium text-foreground/80">Login &amp; Identity</p>
          <p className="text-xs text-muted-foreground">
            Uncheck a population if this organisation has no emails for them — they
            sign in with their Employee ID / Roll Number instead. The admin above
            always uses email.
          </p>
          <label className="flex items-center gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              {...register("staff_email_required")}
              className="rounded border-border"
            />
            Staff &amp; teachers sign in with email
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              {...register("student_email_required")}
              className="rounded border-border"
            />
            Students sign in with email
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5"
        >
          {loading ? "Creating..." : "Create Tenant"}
        </button>
      </form>
    </Modal>
  );
}

// Hard-delete confirmation: requires the super admin's password.
export function DeleteTenantModal({ s }: { s: TenantsPageState }) {
  const { isDeleteModalOpen, setIsDeleteModalOpen, deletePassword, setDeletePassword, deleteLoading, selected } = s;
  return (
    <Modal
      title="Delete Organization Permanently"
      isOpen={isDeleteModalOpen}
      onClose={() => {
        setIsDeleteModalOpen(false);
        setDeletePassword("");
      }}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
          <AlertTriangle size={20} className="text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">
            This will permanently delete <strong>{selected?.name}</strong> and all associated
            data — users, students, employees, and every ERP record. This cannot be undone.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Enter your password to confirm
          </label>
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && deletePassword.trim() !== "" && !deleteLoading) {
                s.handleHardDelete();
              }
            }}
            placeholder="••••••••"
            className="input-field"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsDeleteModalOpen(false);
              setDeletePassword("");
            }}
            className="flex-1 py-2 px-4 rounded-lg font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={s.handleHardDelete}
            disabled={deletePassword.trim() === "" || deleteLoading}
            className="flex-1 py-2 px-4 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteLoading ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
