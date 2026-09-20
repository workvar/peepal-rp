"use client";

// EmployeeFormModal — thin shell around a tabbed employee form.
// Heavy lifting lives in ./form/{Personal,Bank,PfEsi,TaxNps}Tab.tsx and
// EmployeeSalaryTab.tsx. Keeps this file readable.

import Modal from "@/components/ui/Modal";
import { EMPLOYEE_TABS } from "@/constants/employees/tabs";

// Static accent → text-color map. Tailwind scans statically, so dynamic
// class names like `text-${accent}-500` get purged. Keep literals here.
const ACCENT_TEXT: Record<string, string> = {
  violet:  "text-violet-500",
  cyan:    "text-cyan-500",
  emerald: "text-emerald-500",
  amber:   "text-amber-500",
  rose:    "text-rose-500",
};
import PersonalTab from "./form/PersonalTab";
import BankTab from "./form/BankTab";
import PfEsiTab from "./form/PfEsiTab";
import TaxNpsTab from "./form/TaxNpsTab";
import EmployeeSalaryTab from "./EmployeeSalaryTab";
import type {
  DraftSalary,
  EmployeeFormState,
  EmployeeTab,
  GqlDepartment,
} from "@/types/pages/employees/page";

interface EmployeeFormModalProps {
  activeTab: EmployeeTab;
  departments: GqlDepartment[];
  form: EmployeeFormState;
  isOpen: boolean;
  isEditing?: boolean;
  editingUser?: { id: string; name: string; email: string } | null;
  editingEmployeeId?: string | null;

  // Salary draft used only while creating.
  draftSalary?: DraftSalary;
  onDraftSalaryChange?: (next: DraftSalary) => void;

  // Invite-vs-password control for the new account.
  canSendEmail?: boolean;
  tempOpen?: boolean;
  onTempOpenChange?: (open: boolean) => void;

  // Tenant-defined custom roles, merged into the Role dropdown.
  customRoles?: { id: string; name: string }[];

  onClose: () => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  onTabChange: (tab: EmployeeTab) => void;
  onValueChange: (field: keyof EmployeeFormState, value: string | number | boolean) => void;
}

export default function EmployeeFormModal({
  activeTab,
  departments,
  form,
  isOpen,
  isEditing = false,
  editingUser = null,
  editingEmployeeId = null,
  draftSalary,
  onDraftSalaryChange,
  canSendEmail = false,
  tempOpen = false,
  onTempOpenChange,
  customRoles = [],
  onClose,
  onSubmit,
  onTabChange,
  onValueChange,
}: EmployeeFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Employee" : "Add Employee"} size="xl">
      <form className="space-y-5" onSubmit={onSubmit}>
        {/* Tab pills */}
        <nav className="flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-muted/30 p-1.5">
          {EMPLOYEE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                type="button"
                className={`group flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    active ? ACCENT_TEXT[tab.accent] ?? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/*
          Tab body — FIXED height scroll region. This is the key to keeping
          the modal's overall height stable as the user switches tabs:
          short tabs pad out with empty space, tall tabs scroll internally,
          but the outer dialog never resizes. Uses a vh-based clamp so the
          modal is still usable on small laptops.
        */}
        <div className="h-[min(62vh,640px)] overflow-y-auto pr-1">
          {activeTab === "personal" && (
            <PersonalTab
              form={form}
              departments={departments}
              isEditing={isEditing}
              editingEmployeeId={editingEmployeeId}
              editingUser={editingUser}
              onValueChange={onValueChange}
              canSendEmail={canSendEmail}
              tempOpen={tempOpen}
              onTempOpenChange={onTempOpenChange}
              customRoles={customRoles}
            />
          )}
          {activeTab === "bank" && <BankTab form={form} onValueChange={onValueChange} />}
          {activeTab === "pf_esi" && <PfEsiTab form={form} onValueChange={onValueChange} />}
          {activeTab === "tax_nps" && <TaxNpsTab form={form} onValueChange={onValueChange} />}
          {activeTab === "salary" && (
            <EmployeeSalaryTab
              employeeId={editingEmployeeId ?? null}
              draft={draftSalary}
              onDraftChange={onDraftSalaryChange}
            />
          )}
        </div>

        {/* Footer —
           `sticky bottom-0` pins the action bar to the bottom of the
           scrolling DialogBody, so even on short viewports the Cancel /
           Submit buttons remain visible. Negative horizontal margins + a
           backdrop-blurred background extend the bar to the dialog edges
           and hide any form content scrolling underneath.

           When editing, the Salary tab manages its own submit flow, so we
           hide the main footer. When creating, the footer is always shown
           (including on the Salary tab) since the draft is saved as part
           of the main create submit. */}
        {!(isEditing && activeTab === "salary") && (
          <div className="sticky bottom-0 -mx-7 -mb-5 flex items-center justify-end gap-3 border-t border-border/60 bg-card/90 px-7 py-4 backdrop-blur-md">
            <button className="btn-ghost" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="btn-primary" type="submit">
              {isEditing ? "Update Employee" : "Add Employee"}
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
