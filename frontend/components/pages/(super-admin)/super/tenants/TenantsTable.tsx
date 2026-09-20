"use client";

import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Eye, Zap, LogIn } from "lucide-react";
import type { TenantsPageState } from "./useTenantsPage";

// Tenant list table with edit / details / suspend / login-page actions.
export default function TenantsTable({ s }: { s: TenantsPageState }) {
  const { loading, filteredTenants } = s;
  return (
    <div className="card overflow-hidden">
      {loading ? (
        <div className="p-8">
          <LoadingSpinner text="Loading tenants..." />
        </div>
      ) : filteredTenants.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No tenants found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr className="border-b border-border">
                <th className="text-left py-3 px-6 font-semibold text-foreground/80">Name</th>
                <th className="text-left py-3 px-6 font-semibold text-foreground/80">Subdomain</th>
                <th className="text-left py-3 px-6 font-semibold text-foreground/80">Type</th>
                <th className="text-left py-3 px-6 font-semibold text-foreground/80">Status</th>
                <th className="text-left py-3 px-6 font-semibold text-foreground/80">Created</th>
                <th className="text-center py-3 px-6 font-semibold text-foreground/80">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-border/60 hover:bg-muted/40">
                  <td className="py-4 px-6 text-foreground font-medium">{tenant.name}</td>
                  <td className="py-4 px-6 text-muted-foreground text-sm">{tenant.subdomain}</td>
                  <td className="py-4 px-6 text-muted-foreground capitalize">{tenant.type}</td>
                  <td className="py-4 px-6">
                    <Badge
                      label={tenant.status}
                      variant={tenant.status === "active" ? "green" : "red"}
                    />
                  </td>
                  <td className="py-4 px-6 text-muted-foreground text-sm">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => s.openEditModal(tenant)}
                        className="px-2 py-1 text-xs hover:bg-blue-100 text-blue-600 rounded transition-colors"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => s.handleViewDetails(tenant.id)}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => s.handleStatusToggle(tenant.id, tenant.status)}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                        title={tenant.status === "active" ? "Suspend" : "Activate"}
                      >
                        <Zap size={18} className="text-yellow-600" />
                      </button>
                      <button
                        onClick={() => s.handleGoToOrgLogin(tenant.subdomain)}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                        title="Log out of super admin and open this org's login page"
                      >
                        <LogIn size={18} className="text-green-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
