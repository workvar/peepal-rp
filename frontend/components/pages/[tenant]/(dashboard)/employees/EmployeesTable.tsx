"use client";

import { useEffect, useRef } from "react";
import { Building2, Trash2, Edit2 } from "lucide-react";
import type { GqlEmployee } from "@/types/pages/employees/page";
import Can from "@/components/access/Can";

interface EmployeesTableProps {
  employees: GqlEmployee[];
  managerNameByUserId: Map<string, string>;
  selectedIds: Set<string>;
  allSelected: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onBulkDelete: () => void;
  onEdit?: (employee: GqlEmployee) => void;
  onDelete: (id: string, name: string) => void;
}

export default function EmployeesTable({
  employees,
  managerNameByUserId,
  selectedIds,
  allSelected,
  hasMore,
  onLoadMore,
  onToggleSelect,
  onToggleAll,
  onBulkDelete,
  onDelete,
  onEdit,
}: EmployeesTableProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-muted/60 border border-border rounded-lg px-4 py-2 mb-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-3">
            <button onClick={() => onToggleSelect("")} className="text-sm text-muted-foreground hover:text-foreground">
              Clear
            </button>
            <Can module="employees" action="delete">
              <button onClick={onBulkDelete} className="text-sm text-red-500 hover:text-red-700 font-medium">
                Delete selected
              </button>
            </Can>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th w-8">
                  <input type="checkbox" className="rounded" checked={allSelected} onChange={onToggleAll} />
                </th>
                <th className="table-th whitespace-nowrap">Name</th>
                <th className="table-th whitespace-nowrap">Email</th>
                <th className="table-th whitespace-nowrap">Department</th>
                <th className="table-th whitespace-nowrap">Designation</th>
                <th className="table-th whitespace-nowrap">Manager</th>
                <th className="table-th whitespace-nowrap">Phone</th>
                <th className="table-th whitespace-nowrap">Join Date</th>
                <th className="table-th whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {employees.map((employee) => (
                <tr key={employee.id} className="transition-colors hover:bg-muted/40">
                  <td className="table-td">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selectedIds.has(employee.id)}
                      onChange={() => onToggleSelect(employee.id)}
                    />
                  </td>
                  <td className="table-td font-medium whitespace-nowrap">{employee.user?.name ?? "—"}</td>
                  <td className="table-td text-muted-foreground whitespace-nowrap">{employee.user?.email ?? "—"}</td>
                  <td className="table-td whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="text-muted-foreground/70 shrink-0" size={14} />
                      {employee.department?.name ?? "—"}
                    </span>
                  </td>
                  <td className="table-td whitespace-nowrap">{employee.designation || "—"}</td>
                  <td className="table-td text-muted-foreground whitespace-nowrap">
                    {managerNameByUserId.get(employee.user?.id ?? "") || "—"}
                  </td>
                  <td className="table-td whitespace-nowrap">{employee.phone || "—"}</td>
                  <td className="table-td whitespace-nowrap">{employee.joinDate?.slice(0, 10) ?? "—"}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      {onEdit && (
                        <Can module="employees" action="edit">
                          <button className="text-blue-600 transition-colors hover:text-blue-800" onClick={() => onEdit(employee)}>
                            <Edit2 size={16} />
                          </button>
                        </Can>
                      )}
                      <Can module="employees" action="delete">
                        <button
                          className="text-red-500 transition-colors hover:text-red-700"
                          onClick={() => onDelete(employee.id, employee.user?.name ?? "this employee")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td className="table-td py-8 text-center text-muted-foreground/70" colSpan={9}>
                    No employees found. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />
      {hasMore && (
        <p className="py-2 text-center text-xs text-muted-foreground">Loading more…</p>
      )}
    </>
  );
}
