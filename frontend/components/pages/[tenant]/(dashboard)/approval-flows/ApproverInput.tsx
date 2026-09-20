"use client";

import type { ApprovalStep, ApproverType } from "@/api/services/approvals";
import { useTerminology } from "@/store/hooks/useTerminology";
import { roleLabel } from "@/lib/roleLabels";
import SearchableSelect from "@/components/ui/SearchableSelect";

type OrgUser = { id: string; name: string; email: string; role: string };
type Department = { id: string; name: string };

interface Props {
  step: ApprovalStep;
  users: OrgUser[];
  departments: Department[];
  onChange: (next: ApprovalStep) => void;
}

const ROLES = ["admin", "teacher", "staff", "student"];

// Built per-tenant so the department option reads "Anyone in Ward" for a
// hospital and "Anyone in Team" for a company.
const typesFor = (dept: string): { value: ApproverType; label: string; help: string }[] => [
  { value: "manager",    label: "Immediate Manager",     help: "Routes to the requester's direct manager." },
  { value: "user",       label: "Specific Person",       help: "Pick one user." },
  { value: "role",       label: "Anyone with Role",      help: "Anyone holding the chosen role." },
  { value: "department", label: `Anyone in ${dept}`,     help: `Anyone in the chosen ${dept.toLowerCase()}.` },
];

// ApproverInput renders the type-specific input (user picker, role selector, etc.)
// for one step. Kept in its own file so the parent page stays focused on layout.
export default function ApproverInput({ step, users, departments, onChange }: Props) {
  const update = (patch: Partial<ApprovalStep>) => onChange({ ...step, ...patch });
  const t = useTerminology();
  const TYPES = typesFor(t.department);

  return (
    <div className="space-y-2">
      <select
        className="input-field"
        value={step.approver_type}
        onChange={(e) =>
          update({
            approver_type: e.target.value as ApproverType,
            approver_user_id: null,
            approver_role: null,
            approver_department_id: null,
          })
        }
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        {TYPES.find((t) => t.value === step.approver_type)?.help}
      </p>

      {step.approver_type === "user" && (
        <SearchableSelect
          value={step.approver_user_id ?? ""}
          onChange={(v) => update({ approver_user_id: v || null })}
          options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
          placeholder="— Choose user —"
        />
      )}

      {step.approver_type === "role" && (
        <select
          className="input-field"
          value={step.approver_role ?? ""}
          onChange={(e) => update({ approver_role: e.target.value || null })}
        >
          <option value="">— Choose role —</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r, t)}
            </option>
          ))}
        </select>
      )}

      {step.approver_type === "department" && (
        <SearchableSelect
          value={step.approver_department_id ?? ""}
          onChange={(v) => update({ approver_department_id: v || null })}
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          placeholder={`— Choose ${t.department.toLowerCase()} —`}
        />
      )}
    </div>
  );
}
