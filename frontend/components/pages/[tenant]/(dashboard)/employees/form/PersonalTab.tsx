"use client";

// Personal details tab — identity, contact, employment, emergency contact.

import { IdCard, Phone, Briefcase, HeartPulse, Image as ImageIcon } from "lucide-react";
import PhotoUpload from "@/components/ui/PhotoUpload";
import SelectBox from "@/components/ui/SelectBox";
import InvitePasswordField from "@/components/ui/InvitePasswordField";
import WorkspaceRolesPanel from "@/components/access/WorkspaceRolesPanel";
import FormSection, { Field } from "./FormSection";
import { useQuery } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import type { EmployeeFormState, GqlDepartment } from "@/types/pages/employees/page";
import { GET_SYSTEM_ROLES } from "@/graphql/queries/org";

const GENDER_OPTS = [
  { value: "male",   label: "Male"   },
  { value: "female", label: "Female" },
  { value: "other",  label: "Other"  },
];

const EMPLOYMENT_OPTS = [
  { value: "permanent", label: "Permanent" },
  { value: "contract",  label: "Contract"  },
  { value: "part-time", label: "Part-time" },
];

// Prefix used to distinguish a custom-role choice from a base system role in
// the single Role dropdown. A value of "custom:<id>" means "keep a base
// employee role and layer this custom role's permissions on top".
export const CUSTOM_ROLE_PREFIX = "custom:";

interface GqlSystemRole {
  id: string; roleId: string; label: string;
}

interface Props {
  form: EmployeeFormState;
  departments: GqlDepartment[];
  isEditing: boolean;
  editingEmployeeId: string | null;
  editingUser: { id: string; name: string; email: string } | null;
  onValueChange: (field: keyof EmployeeFormState, value: string | number | boolean) => void;
  canSendEmail?: boolean;
  tempOpen?: boolean;
  onTempOpenChange?: (open: boolean) => void;
  customRoles?: { id: string; name: string }[];
}

export default function PersonalTab({
  form, departments, isEditing, editingEmployeeId, editingUser, onValueChange,
  canSendEmail = false, tempOpen = false, onTempOpenChange, customRoles = [],
}: Props) {
  // Email is optional for staff only when the org signs them in by Employee ID.
  const staffEmailRequired = useAppSelector((s) => s.auth.user?.staff_email_required ?? true);

  // Role dropdown = the tenant's system roles minus admin (managed on the
  // Admins page), then every custom role — both straight from the DB, so the
  // picker mirrors the Roles & Permissions page and never hardcodes a list.
  const { data: sysData } = useQuery(GET_SYSTEM_ROLES);
  const systemRoles: GqlSystemRole[] = sysData?.systemRoles ?? [];
  const assignableRoles = systemRoles.filter((r) => r.roleId !== "admin");
  const baseRoleIds = assignableRoles.map((r) => r.roleId);
  const ROLE_OPTS = [
    ...assignableRoles.map((r) => ({ value: r.roleId, label: r.label })),
    ...customRoles.map((r) => ({ value: `${CUSTOM_ROLE_PREFIX}${r.id}`, label: r.name })),
  ];

  // A custom role selection shows as its own entry but keeps the base role
  // underneath (defaults to staff). Picking a base role clears the custom role.
  const roleValue = form.custom_role_id ? `${CUSTOM_ROLE_PREFIX}${form.custom_role_id}` : form.role;
  const handleRoleChange = (v: string) => {
    if (v.startsWith(CUSTOM_ROLE_PREFIX)) {
      onValueChange("custom_role_id", v.slice(CUSTOM_ROLE_PREFIX.length));
      if (!baseRoleIds.includes(form.role)) onValueChange("role", "staff");
    } else {
      onValueChange("role", v);
      onValueChange("custom_role_id", "");
    }
  };
  return (
    <div className="space-y-5">
      {/* ── Identity ────────────────────────────── */}
      <FormSection icon={IdCard} title="Identity" accent="violet" description="Basic profile info and linked user account.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr] md:items-start">
          {/* Photo */}
          <div className="md:w-28">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Photo</label>
            {isEditing && editingEmployeeId ? (
              <PhotoUpload
                entity="employee"
                id={editingEmployeeId}
                value={form.photo_url}
                fallbackName={editingUser?.name ?? ""}
                onChange={(url) => onValueChange("photo_url", url)}
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            {!isEditing && (
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">Upload after saving.</p>
            )}
          </div>

          {/* Right-side identity fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full Name" required>
              <input className="input-field" required placeholder="e.g. Jane Doe"
                value={form.name}
                onChange={(e) => onValueChange("name", e.target.value)} />
            </Field>

            <Field label="Role">
              <SelectBox
                value={roleValue}
                onChange={handleRoleChange}
                options={ROLE_OPTS}
              />
            </Field>

            <Field label={`Email${staffEmailRequired ? "" : " (optional)"}`} className="sm:col-span-2">
              <input className="input-field" type="email" required={staffEmailRequired}
                placeholder={staffEmailRequired ? "jane@example.org" : "Leave blank for Employee ID login"}
                value={form.email}
                onChange={(e) => onValueChange("email", e.target.value)} />
            </Field>

            <div className="sm:col-span-2">
              <InvitePasswordField
                canSendEmail={canSendEmail}
                email={form.email}
                password={form.password}
                onPasswordChange={(v) => onValueChange("password", v)}
                tempOpen={tempOpen}
                onTempOpenChange={onTempOpenChange ?? (() => {})}
                editing={isEditing}
              />
            </div>

            {/* Extra roles this employee can switch into (e.g. a teacher who is
                also enrolled as a student). Only available once the account
                exists, so it appears on edit. Saves on toggle. */}
            <div className="sm:col-span-2">
              <WorkspaceRolesPanel userId={editingUser?.id ?? null} />
            </div>

            <Field label="Employee ID" required>
              <input className="input-field" required placeholder="EMP001"
                value={form.employee_id}
                onChange={(e) => onValueChange("employee_id", e.target.value)} />
            </Field>

            <Field label="Department">
              <SelectBox
                value={form.department_id}
                onChange={(v) => onValueChange("department_id", v)}
                placeholder="Select department…"
                searchable={departments.length > 8}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
              />
            </Field>

            <Field label="Designation" className="sm:col-span-2">
              <input className="input-field" placeholder="e.g. Senior Lecturer"
                value={form.designation}
                onChange={(e) => onValueChange("designation", e.target.value)} />
            </Field>
          </div>
        </div>
      </FormSection>

      {/* ── Personal ────────────────────────────── */}
      <FormSection icon={HeartPulse} title="Personal" accent="rose" description="Optional personal particulars.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Gender">
            <SelectBox
              value={form.gender}
              onChange={(v) => onValueChange("gender", v)}
              options={GENDER_OPTS}
            />
          </Field>
          <Field label="Date of Birth">
            <input type="date" className="input-field" value={form.date_of_birth}
              onChange={(e) => onValueChange("date_of_birth", e.target.value)} />
          </Field>
          <Field label="Blood Group">
            <input className="input-field" placeholder="O+"
              value={form.blood_group}
              onChange={(e) => onValueChange("blood_group", e.target.value)} />
          </Field>
        </div>
      </FormSection>

      {/* ── Employment ────────────────────────────── */}
      <FormSection icon={Briefcase} title="Employment" accent="emerald" description="Contract and tenure details.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Join Date">
            <input type="date" className="input-field" value={form.join_date}
              onChange={(e) => onValueChange("join_date", e.target.value)} />
          </Field>
          <Field label="Employment Type">
            <SelectBox
              value={form.employment_type}
              onChange={(v) => onValueChange("employment_type", v)}
              options={EMPLOYMENT_OPTS}
            />
          </Field>
        </div>
      </FormSection>

      {/* ── Contact ────────────────────────────── */}
      <FormSection icon={Phone} title="Contact & Emergency" accent="cyan" description="Reachability and next of kin.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Phone">
            <input className="input-field" placeholder="+91 98765 43210"
              value={form.phone} onChange={(e) => onValueChange("phone", e.target.value)} />
          </Field>
          <Field label="Emergency Name">
            <input className="input-field" value={form.emergency_name}
              onChange={(e) => onValueChange("emergency_name", e.target.value)} />
          </Field>
          <Field label="Emergency Phone">
            <input className="input-field" value={form.emergency_phone}
              onChange={(e) => onValueChange("emergency_phone", e.target.value)} />
          </Field>
        </div>
      </FormSection>
    </div>
  );
}
