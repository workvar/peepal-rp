"use client";

import { Badge } from "@/components/ui/badge";
import type { TenantsPageState } from "./useTenantsPage";

// Right-hand slide-over with the selected tenant's details and actions
// (edit, suspend/activate, impersonate, delete).
export default function TenantDetailsPanel({ s }: { s: TenantsPageState }) {
  const { selected, setIsDetailsPanelOpen, setIsDeleteModalOpen, setDeletePassword } = s;
  if (!selected) return null;
  const closeAll = () => {
    setIsDetailsPanelOpen(false);
    setIsDeleteModalOpen(false);
    setDeletePassword("");
  };
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/40" onClick={closeAll} />
      <div className="relative ml-auto w-full max-w-md bg-card shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-foreground">Tenant Details</h3>
          <button
            onClick={closeAll}
            className="text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="text-foreground font-medium">{selected.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Subdomain</p>
            <p className="text-foreground font-medium">{selected.subdomain}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="text-foreground font-medium capitalize">{selected.type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge
              label={selected.status}
              variant={selected.status === "active" ? "green" : "red"}
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Timezone</p>
            <p className="text-foreground font-medium">{selected.timezone}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Currency</p>
            <p className="text-foreground font-medium">{selected.currency}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Primary Admin Email</p>
            <p className="text-foreground font-medium">{selected.primary_admin_email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created At</p>
            <p className="text-foreground font-medium">
              {new Date(selected.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t p-6 space-y-2">
          <button
            onClick={() => s.openEditModal(selected)}
            className="w-full py-2 px-4 rounded-lg font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
          >
            Edit Details
          </button>
          <button
            onClick={() => s.handleStatusToggle(selected.id, selected.status)}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              selected.status === "active"
                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                : "bg-green-100 text-green-800 hover:bg-green-200"
            }`}
          >
            {selected.status === "active" ? "Suspend Tenant" : "Activate Tenant"}
          </button>
          <button
            onClick={() => s.handleImpersonate(selected.id)}
            className="w-full py-2 px-4 rounded-lg font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
          >
            Impersonate
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full py-2 px-4 rounded-lg font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
          >
            Delete Organization
          </button>
        </div>
      </div>
    </div>
  );
}
