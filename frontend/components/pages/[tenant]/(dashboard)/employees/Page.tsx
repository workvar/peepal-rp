"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { CREATE_EMPLOYEE, DELETE_EMPLOYEE, LIST_DEPARTMENTS, LIST_EMPLOYEES } from "@/queries/pages/employees/employees";
import { GET_SALARY_TEMPLATES } from "@/graphql/queries/salary";
import { GET_ORG_USERS, GET_CUSTOM_ROLES } from "@/graphql/queries/org";
import { ASSIGN_USER_CUSTOM_ROLE } from "@/graphql/mutations/org";
import { orgAdminAPI } from "@/api/services/org";
import { UPDATE_EMPLOYEE } from "@/graphql/mutations/employees";
import Header from "@/components/layout/Header";
import { TableSkeleton } from "@/components/ui/skeletons";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import EmployeeFormModal from "@/components/pages/[tenant]/(dashboard)/employees/EmployeeFormModal";
import EmployeesTable from "@/components/pages/[tenant]/(dashboard)/employees/EmployeesTable";
import { BulkUploadButton } from "@/components/ui/BulkUpload";
import {
  buildEmployeeInput,
  buildEmployeeUpdateInput,
  emptyEmployeeForm,
  employeeFormFromGql,
} from "@/functions/employees/employeeForm";
import { emptyDraftSalary } from "@/functions/employees/draftSalary";
import { invitePasswordPayload } from "@/components/ui/InvitePasswordField";
import { useEmailSendStatus } from "@/lib/useEmailSendStatus";
import { apolloClient } from "@/lib/apollo";
import { ASSIGN_SALARY_TEMPLATE } from "@/graphql/mutations/salary";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { Plus } from "lucide-react";
import type {
  DraftSalary,
  EmployeeFormState,
  EmployeeTab,
  GqlDepartment,
  GqlEmployee,
} from "@/types/pages/employees/page";
import { useTerminology } from "@/store/hooks/useTerminology";
import QueryError from "@/components/ui/QueryError";
import EmployeeStatsChip from "./EmployeeStatsChip";
import Can from "@/components/access/Can";

export default function EmployeesPage() {
  const t = useTerminology();
  const { data: empData, loading, error, refetch } = useQuery(LIST_EMPLOYEES);
  const { data: deptData } = useQuery(LIST_DEPARTMENTS);
  const { data: templatesData } = useQuery(GET_SALARY_TEMPLATES);
  const { data: orgUsersData } = useQuery(GET_ORG_USERS);
  const { data: customRolesData } = useQuery(GET_CUSTOM_ROLES);
  const customRoles: { id: string; name: string }[] = customRolesData?.customRoles ?? [];
  const [assignCustomRole] = useMutation(ASSIGN_USER_CUSTOM_ROLE);

  // userId -> customRoleId map, loaded via REST (not exposed on the User type).
  // Used to prefill the Role dropdown when editing an existing employee.
  const [roleByUserId, setRoleByUserId] = useState<Map<string, string>>(new Map());
  const loadCustomRoleMap = useCallback(async () => {
    try {
      const resp = await orgAdminAPI.listUsersCustomRoles();
      const rows: { id: string; custom_role_id?: string | null }[] = resp.data?.data ?? [];
      setRoleByUserId(new Map(rows.filter((r) => r.custom_role_id).map((r) => [r.id, r.custom_role_id as string])));
    } catch {
      /* non-fatal: dropdown still works, edit just won't prefill the custom role */
    }
  }, []);
  useEffect(() => { void loadCustomRoleMap(); }, [loadCustomRoleMap]);

  const [createEmployee] = useMutation(CREATE_EMPLOYEE, {
    refetchQueries: [{ query: LIST_EMPLOYEES }],
  });
  const [updateEmployee] = useMutation(UPDATE_EMPLOYEE, {
    refetchQueries: [{ query: LIST_EMPLOYEES }],
  });
  const [deleteEmployee] = useMutation(DELETE_EMPLOYEE, {
    refetchQueries: [{ query: LIST_EMPLOYEES }],
  });

  const employees: GqlEmployee[] = empData?.employees ?? [];
  const departments: GqlDepartment[] = deptData?.departments ?? [];
  // orgUsers has managerId per user; used to render the manager column.
  // Reporting lines are edited on the Org Structure page.
  const orgUsers: Array<{ id: string; name: string; managerId?: string | null }> = orgUsersData?.orgUsers ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlEmployee | null>(null);
  const [activeTab, setActiveTab] = useState<EmployeeTab>("personal");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(emptyEmployeeForm);
  const [tempOpen, setTempOpen] = useState(false);
  const { status: emailStatus } = useEmailSendStatus();
  const [draftSalary, setDraftSalary] = useState<DraftSalary>(emptyDraftSalary);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(25);

  // Reset to first page whenever the search filter changes.
  useEffect(() => { setVisibleCount(25); }, [search]);

  const set = (field: keyof EmployeeFormState, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setActiveTab("personal");
    setForm(emptyEmployeeForm);
    setDraftSalary(emptyDraftSalary());
    setTempOpen(false);
  };

  function openCreate() {
    setEditing(null);
    setForm(emptyEmployeeForm);
    setDraftSalary(emptyDraftSalary());
    setActiveTab("personal");
    setTempOpen(false);
    setShowModal(true);
  }

  function openEdit(employee: GqlEmployee) {
    setEditing(employee);
    const uid = employee.user?.id;
    const custom_role_id = uid ? roleByUserId.get(uid) ?? "" : "";
    setForm({ ...employeeFormFromGql(employee), custom_role_id });
    setActiveTab("personal");
    setShowModal(true);
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const pay = invitePasswordPayload({
        canSendEmail: emailStatus.canSend,
        tempOpen,
        password: form.password,
      });
      const res = await createEmployee({
        variables: {
          input: buildEmployeeInput(form, pay),
        },
      });
      toast.success(pay.sendInvite ? "Employee added — invite email sent" : "Employee added");

      // If the admin pre-selected a salary template on the Salary tab,
      // replay that as a salary-assignment POST now that we have the new
      // employee id. Salary assignment failures shouldn't block the
      // successful create — just notify the user so they can retry from
      // the edit screen.
      const newId: string | undefined = res.data?.createEmployee?.id;
      const newUserId: string | undefined = res.data?.createEmployee?.user?.id;

      // Attach the selected custom role (permissions overlay) to the new login.
      if (newUserId && form.custom_role_id) {
        try {
          await assignCustomRole({ variables: { userId: newUserId, customRoleId: form.custom_role_id } });
        } catch {
          toast.error("Employee saved, but couldn't attach the custom role");
        }
        void loadCustomRoleMap();
      }

      if (newId && draftSalary.template_id) {
        try {
          await apolloClient.mutate({
            mutation: ASSIGN_SALARY_TEMPLATE,
            variables: {
              input: {
                employeeId: newId,
                templateId: draftSalary.template_id,
                extraAllowance: draftSalary.extra_allowance,
                extraDeduction: draftSalary.extra_deduction,
                effectiveFrom: draftSalary.effective_from,
                notes: draftSalary.notes,
              },
            },
          });
          toast.success("Salary template attached");
        } catch (err: unknown) {
          const e = err as { message?: string };
          toast.error(e.message || "Employee saved, but couldn't attach salary template");
        }
      }

      closeModal();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to add employee"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);

    try {
      await updateEmployee({
        variables: { id: editing.id, input: buildEmployeeUpdateInput(form) },
      });

      // Sync the custom-role overlay (assign, change, or detach with null).
      const uid = editing.user?.id;
      if (uid) {
        try {
          await assignCustomRole({ variables: { userId: uid, customRoleId: form.custom_role_id || null } });
        } catch {
          toast.error("Employee updated, but couldn't update the custom role");
        }
        void loadCustomRoleMap();
      }

      toast.success("Employee updated");
      closeModal();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update employee"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmState({
      title: "Delete Employee",
      message: `Delete ${name}? This permanently removes their employee profile and login account.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteEmployee({ variables: { id } });
        toast.success("Employee removed");
      },
    });
  };

  const salaryTemplateDynamicOptions = (templatesData?.salaryTemplates ?? []).map(
    (t: { id: string; name: string }) => ({ label: t.name, value: t.id })
  );

  const departmentDynamicOptions = departments.map(
    (d) => ({ label: d.name, value: d.id })
  );

  // Build userId -> managerName map for the table column.
  const orgUserById = new Map(orgUsers.map((u) => [u.id, u]));
  const managerNameByUserId = new Map(
    orgUsers
      .filter((u) => u.managerId)
      .map((u) => [u.id, orgUserById.get(u.managerId!)?.name ?? ""])
  );

  const q = search.toLowerCase();
  const filteredEmployees = q
    ? employees.filter(
        (e) =>
          e.user?.name?.toLowerCase().includes(q) ||
          e.user?.email?.toLowerCase().includes(q) ||
          e.department?.name?.toLowerCase().includes(q) ||
          e.designation?.toLowerCase().includes(q) ||
          e.employeeId?.toLowerCase().includes(q)
      )
    : employees;

  const allSelected = filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedIds.has(e.id));

  const toggleSelect = (id: string) => {
    if (id === "") {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
    }
  };

  const handleBulkDelete = () => {
    const ids = [...selectedIds];
    setConfirmState({
      title: "Delete Employees",
      message: `Delete ${ids.length} selected employee${ids.length > 1 ? "s" : ""}? This permanently removes their profiles and login accounts.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await Promise.all(ids.map((id) => deleteEmployee({ variables: { id } })));
        setSelectedIds(new Set());
        toast.success(`${ids.length} employee${ids.length > 1 ? "s" : ""} removed`);
      },
    });
  };

  return (
    <div>
      <Header
        title="Employees"
        subtitle={`Manage staff and ${t.staff_plural.toLowerCase()}`}
        action={
          <div className="flex items-center gap-2">
            <EmployeeStatsChip />
            <BulkUploadButton
              resource="employees"
              onFinished={(s) => {
                if (s.successful > 0) refetch();
              }}
              dynamicOptions={{
                department_id: departmentDynamicOptions,
                salary_template_id: salaryTemplateDynamicOptions,
              }}
            />
            <Can module="employees" action="create">
              <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
                <Plus size={16} /> Add Employee
              </button>
            </Can>
          </div>
        }
      />

      {error && <QueryError message={error.message} onRetry={() => void refetch()} />}

      <div className="mb-4">
        <input
          className="input-field w-full"
          placeholder="Search by name, email, department, designation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && employees.length === 0 ? (
        <TableSkeleton
          columns={["", "Name", "Email", t.department, "Designation", "Manager", "Phone", "Join Date", "Actions"]}
          colWidths={["w-8", "w-32", "w-48", "w-28", "w-28", "w-28", "w-24", "w-20", "w-12"]}
          rows={6}
        />
      ) : (
        <EmployeesTable
          employees={filteredEmployees.slice(0, visibleCount)}
          managerNameByUserId={managerNameByUserId}
          selectedIds={selectedIds}
          allSelected={allSelected}
          hasMore={visibleCount < filteredEmployees.length}
          onLoadMore={() => setVisibleCount((n) => n + 25)}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
          onBulkDelete={handleBulkDelete}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
      <EmployeeFormModal
        activeTab={activeTab}
        departments={departments}
        form={form}
        isOpen={showModal}
        isEditing={!!editing}
        editingUser={editing?.user ?? null}
        editingEmployeeId={editing?.id ?? null}
        draftSalary={draftSalary}
        onDraftSalaryChange={setDraftSalary}
        canSendEmail={emailStatus.canSend}
        tempOpen={tempOpen}
        onTempOpenChange={setTempOpen}
        onClose={closeModal}
        onSubmit={editing ? handleUpdate : handleCreate}
        onTabChange={setActiveTab}
        onValueChange={set}
        customRoles={customRoles}
      />
    </div>
  );
}
