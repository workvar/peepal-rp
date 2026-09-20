"use client";

import PageHeader from "@/components/ui/PageHeader";
import { Plus } from "lucide-react";
import { useTenantsPage } from "./useTenantsPage";
import TenantsTable from "./TenantsTable";
import TenantDetailsPanel from "./TenantDetailsPanel";
import { EditTenantModal, CreateTenantModal, DeleteTenantModal } from "./TenantModals";

export default function TenantsPage() {
  const s = useTenantsPage();
  const { statusFilter, setStatusFilter } = s;

  return (
    <div>
      <PageHeader
        title="Tenant Management"
        subtitle="Manage all platform tenants"
        actions={
          <button
            onClick={() => s.setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 btn-primary text-white rounded-lg  transition-colors"
          >
            <Plus size={18} />
            Create Tenant
          </button>
        }
      />

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        {(["all", "active", "suspended"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? "btn-primary text-white"
                : "bg-gray-200 text-foreground/80 hover:bg-gray-300"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Tenants Table */}
      <TenantsTable s={s} />

      <EditTenantModal s={s} />
      <CreateTenantModal s={s} />

      {/* Details Panel */}
      {s.isDetailsPanelOpen && s.selected && <TenantDetailsPanel s={s} />}

      <DeleteTenantModal s={s} />
    </div>
  );
}
