'use client';

// Salary page — redesigned around named, reusable templates.
//
// Admins create salary TEMPLATES (name + components) and then ASSIGN a
// template to one or more employees. An employee's payroll is computed from
// whichever template they are currently assigned to, plus optional
// per-assignment "extra allowance" and "extra deduction" overrides.
//
// The two tabs live at their own URLs:
//   /salary/templates    → Templates tab
//   /salary/assignment   → Assignments tab
// Switching tabs is a real route change, so deep links and the browser
// back button both work naturally.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import toast from 'react-hot-toast';
import { LIST_EMPLOYEES } from '@/graphql/queries/employees';
import { GET_SALARY_TEMPLATES, GET_SALARY_ASSIGNMENTS } from '@/graphql/queries/salary';
import {
  CREATE_SALARY_TEMPLATE,
  UPDATE_SALARY_TEMPLATE,
  DELETE_SALARY_TEMPLATE,
  BULK_ASSIGN_SALARY_TEMPLATE,
  DELETE_SALARY_ASSIGNMENT,
} from '@/graphql/mutations/salary';
import { apolloClient } from '@/lib/apollo';
import { useAppSelector } from '@/store/hooks';
import ConfirmDialog, { type ConfirmState } from '@/components/ui/ConfirmDialog';
import BulkUploadButton from '@/components/ui/BulkUpload/BulkUploadButton';
import Can from '@/components/access/Can';
import TemplatesTab from './TemplatesTab';
import AssignmentsTab from './AssignmentsTab';
import TemplateFormModal from './TemplateFormModal';
import BulkAssignModal from './BulkAssignModal';
import type {
  SalaryTemplate,
  SalaryAssignment,
  TemplateFormState,
  AssignmentEmployee,
} from './types';

export type SalaryTab = 'templates' | 'assignment';

interface Props {
  initialTab: SalaryTab;
}

// GraphQL employees come back in camelCase; normalise to the snake_case shape
// the assignment tables use.
function normaliseEmployee(e: {
  id: string;
  employeeId?: string;
  user?: { id: string; name: string; email: string } | null;
  department?: { id: string; name: string } | null;
}): AssignmentEmployee {
  return {
    id: e.id,
    employee_id: e.employeeId,
    user: e.user ?? null,
    department: e.department ?? null,
  };
}

// GQL salary template → local type
function normaliseTemplate(t: Record<string, unknown>): SalaryTemplate {
  return {
    id: t.id as string,
    name: t.name as string,
    description: t.description as string,
    basic_salary: t.basicSalary as number,
    hra: t.hra as number,
    da: t.da as number,
    ta: t.ta as number,
    medical_allowance: t.medicalAllowance as number,
    other_allowances: t.otherAllowances as number,
    pf: t.pf as number,
    esi: t.esi as number,
    tds: t.tds as number,
    other_deductions: t.otherDeductions as number,
    is_active: t.isActive as boolean,
  };
}

// GQL salary assignment → local type
function normaliseAssignment(a: Record<string, unknown>): SalaryAssignment {
  const emp = a.employee as Record<string, unknown> | null;
  const tpl = a.template as Record<string, unknown> | null;
  return {
    id: a.id as string,
    employee_id: a.employeeId as string,
    template_id: a.templateId as string,
    extra_allowance: a.extraAllowance as number,
    extra_deduction: a.extraDeduction as number,
    effective_from: a.effectiveFrom as string,
    effective_to: a.effectiveTo as string | null,
    is_active: a.isActive as boolean,
    notes: a.notes as string,
    employee: emp ? {
      id: emp.id as string,
      employee_id: emp.employeeId as string,
      user: emp.user as { id: string; name: string; email: string } | null,
      department: emp.department as { id: string; name: string } | null,
    } : null,
    template: tpl ? normaliseTemplate(tpl) : null,
  };
}

// TemplateFormState uses snake_case; GQL input uses camelCase — convert
function templateFormToGqlInput(form: TemplateFormState) {
  return {
    name: form.name,
    description: form.description,
    basicSalary: form.basic_salary,
    hra: form.hra,
    da: form.da,
    ta: form.ta,
    medicalAllowance: form.medical_allowance,
    otherAllowances: form.other_allowances,
    pf: form.pf,
    esi: form.esi,
    tds: form.tds,
    otherDeductions: form.other_deductions,
  };
}

export default function SalaryPage({ initialTab }: Props) {
  const router = useRouter();
  const { tenantSlug } = useAppSelector((s) => s.auth);
  const slug =
    tenantSlug ??
    (typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : '') ??
    '';
  const tenantHref = (path: string) => (slug ? `/${slug}${path}` : path);

  const [tab, setTab] = useState<SalaryTab>(initialTab);
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  const [search, setSearch] = useState('');

  // Data loaded via Apollo useQuery
  const {
    data: tplData,
    loading: loadingTemplates,
    refetch: refetchTemplates,
  } = useQuery(GET_SALARY_TEMPLATES, { fetchPolicy: 'network-only' });

  const {
    data: asnData,
    loading: loadingAssignments,
    refetch: refetchAssignments,
  } = useQuery(GET_SALARY_ASSIGNMENTS, { fetchPolicy: 'network-only' });

  const templates: SalaryTemplate[] = useMemo(
    () => (tplData?.salaryTemplates ?? []).map(normaliseTemplate),
    [tplData],
  );

  const assignments: SalaryAssignment[] = useMemo(
    () => (asnData?.salaryAssignments ?? []).map(normaliseAssignment),
    [asnData],
  );

  // Modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SalaryTemplate | null>(null);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInitialTemplate, setBulkInitialTemplate] = useState<SalaryTemplate | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [showActiveAssignmentsOnly, setShowActiveAssignmentsOnly] = useState(true);

  // Employees (from GraphQL).
  const { data: empData } = useQuery(LIST_EMPLOYEES);
  const employees: AssignmentEmployee[] = useMemo(
    () => (empData?.employees ?? []).map(normaliseEmployee),
    [empData],
  );

  const assignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of assignments) {
      if (a.is_active) counts[a.template_id] = (counts[a.template_id] ?? 0) + 1;
    }
    return counts;
  }, [assignments]);

  function switchTab(next: SalaryTab) {
    if (next === tab) return;
    setTab(next);
    router.push(tenantHref(next === 'templates' ? '/salary/templates' : '/salary/assignment'));
  }

  function openCreateTemplate() {
    setEditingTemplate(null);
    setShowTemplateModal(true);
  }

  function openEditTemplate(t: SalaryTemplate) {
    setEditingTemplate(t);
    setShowTemplateModal(true);
  }

  async function handleTemplateSubmit(form: TemplateFormState) {
    setTemplateSubmitting(true);
    try {
      if (editingTemplate) {
        await apolloClient.mutate({
          mutation: UPDATE_SALARY_TEMPLATE,
          variables: { id: editingTemplate.id, input: templateFormToGqlInput(form) },
        });
        toast.success('Template updated');
      } else {
        await apolloClient.mutate({
          mutation: CREATE_SALARY_TEMPLATE,
          variables: { input: templateFormToGqlInput(form) },
        });
        toast.success('Template created');
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      await refetchTemplates();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || 'Failed to save template');
    } finally {
      setTemplateSubmitting(false);
    }
  }

  function handleDeleteTemplate(t: SalaryTemplate) {
    setConfirmState({
      title: 'Delete Template',
      message: `Delete "${t.name}"? This cannot be undone. Templates with active assignments cannot be deleted — reassign those employees first.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await apolloClient.mutate({
            mutation: DELETE_SALARY_TEMPLATE,
            variables: { id: t.id },
          });
          toast.success('Template deleted');
          await refetchTemplates();
          await refetchAssignments();
        } catch (err: unknown) {
          const e = err as { message?: string };
          toast.error(e.message || 'Failed to delete template');
        }
      },
    });
  }

  function openBulkAssign(t?: SalaryTemplate) {
    setBulkInitialTemplate(t ?? null);
    setShowBulkModal(true);
  }

  async function handleBulkAssign(payload: {
    template_id: string;
    employee_ids: string[];
    extra_allowance: number;
    extra_deduction: number;
    effective_from: string;
    notes: string;
  }) {
    setBulkSubmitting(true);
    try {
      const { data } = await apolloClient.mutate({
        mutation: BULK_ASSIGN_SALARY_TEMPLATE,
        variables: {
          input: {
            templateId: payload.template_id,
            employeeIds: payload.employee_ids,
            extraAllowance: payload.extra_allowance,
            extraDeduction: payload.extra_deduction,
            effectiveFrom: payload.effective_from,
            notes: payload.notes,
          },
        },
      });
      const count = data?.bulkAssignSalaryTemplate?.assignedCount ?? payload.employee_ids.length;
      toast.success(`Assigned to ${count} employee${count === 1 ? '' : 's'}`);
      setShowBulkModal(false);
      setBulkInitialTemplate(null);
      await refetchAssignments();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || 'Failed to assign');
    } finally {
      setBulkSubmitting(false);
    }
  }

  function handleRemoveAssignment(a: SalaryAssignment) {
    setConfirmState({
      title: 'Remove Assignment',
      message: `Remove ${a.template?.name ?? 'this template'} from ${a.employee?.user?.name ?? employees.find((e) => e.id === a.employee_id)?.user?.name ?? 'this employee'}? Payroll for months this assignment was active is NOT affected.`,
      variant: 'danger',
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await apolloClient.mutate({
            mutation: DELETE_SALARY_ASSIGNMENT,
            variables: { id: a.id },
          });
          toast.success('Assignment removed');
          await refetchAssignments();
        } catch (err: unknown) {
          const e = err as { message?: string };
          toast.error(e.message || 'Failed to remove');
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salary</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define named salary templates and assign them to one or more employees.
          </p>
        </div>
        <div className="flex gap-2">
          {tab === 'templates' ? (
            <>
              <BulkUploadButton
                resource="salary_templates"
                onFinished={() => refetchTemplates()}
                size="sm"
              />
              <Can module="salary-templates" action="create">
                <button
                  onClick={openCreateTemplate}
                  className="btn-primary rounded-lg px-4 py-2 text-sm font-medium text-white"
                >
                  + New Template
                </button>
              </Can>
            </>
          ) : (
            <>
              <BulkUploadButton
                resource="salary_assignments"
                onFinished={() => refetchAssignments()}
                size="sm"
              />
              <Can module="salary-assignments" action="create">
                <button
                  onClick={() => openBulkAssign()}
                  className="btn-primary rounded-lg px-4 py-2 text-sm font-medium text-white"
                >
                  + Assign Template
                </button>
              </Can>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'templates'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => switchTab('templates')}
        >
          Templates ({templates.length})
        </button>
        <button
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'assignment'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => switchTab('assignment')}
        >
          Assignments ({assignments.length})
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="min-w-[200px] flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={tab === 'templates' ? 'Search template name / description…' : 'Search employee or template…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Body */}
      {tab === 'templates' ? (
        <TemplatesTab
          templates={templates}
          loading={loadingTemplates}
          search={search}
          assignmentCounts={assignmentCounts}
          onEdit={openEditTemplate}
          onDelete={handleDeleteTemplate}
          onAssign={(t) => {
            setBulkInitialTemplate(t);
            setShowBulkModal(true);
            switchTab('assignment');
          }}
        />
      ) : (
        <AssignmentsTab
          assignments={assignments}
          loading={loadingAssignments}
          search={search}
          showActiveOnly={showActiveAssignmentsOnly}
          onToggleActiveOnly={setShowActiveAssignmentsOnly}
          onRemove={handleRemoveAssignment}
          employeesById={Object.fromEntries(employees.map((e) => [e.id, e]))}
        />
      )}

      {/* Modals */}
      <TemplateFormModal
        isOpen={showTemplateModal}
        editing={editingTemplate}
        submitting={templateSubmitting}
        onClose={() => {
          setShowTemplateModal(false);
          setEditingTemplate(null);
        }}
        onSubmit={handleTemplateSubmit}
      />

      <BulkAssignModal
        key={`bulk-${bulkInitialTemplate?.id ?? 'none'}-${showBulkModal}`}
        isOpen={showBulkModal}
        templates={templates}
        employees={employees}
        submitting={bulkSubmitting}
        initialTemplateId={bulkInitialTemplate?.id}
        onClose={() => {
          setShowBulkModal(false);
          setBulkInitialTemplate(null);
        }}
        onSubmit={handleBulkAssign}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
