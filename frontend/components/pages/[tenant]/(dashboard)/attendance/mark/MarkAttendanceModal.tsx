"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import Modal from "@/components/ui/Modal";
import SearchableSelect, { type SelectOption } from "@/components/ui/SearchableSelect";
import { LIST_STUDENTS } from "@/graphql/queries/students";
import { LIST_EMPLOYEES } from "@/graphql/queries/employees";
import type { GqlStudent } from "@/types/pages/students/page";
import type { GqlEmployee } from "@/types/pages/employees/page";
import AttendancePainter from "./AttendancePainter";
import type { EntityType } from "./types";
import { useTerminology, useTenantType } from "@/store/hooks/useTerminology";
import { moduleAllowedForIndustry } from "@/lib/access";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Modal shell: filter by type, search for a person, then paint their calendar.
// The painter is keyed by the selected id so switching people gives a clean slate.
export default function MarkAttendanceModal({ isOpen, onClose, onSaved }: Props) {
  const terms = useTerminology();
  const tenantType = useTenantType();
  // Only education keeps a member population separate from employees. Outside
  // it the students module does not exist, so the filter drops to employees.
  const hasMembers = moduleAllowedForIndustry("students", tenantType);

  const TYPES: { key: EntityType; label: string }[] = [
    ...(hasMembers ? [{ key: "student" as EntityType, label: terms.member_plural }] : []),
    { key: "employee", label: "Staff" },
  ];

  const [entityType, setEntityType] = useState<EntityType>(hasMembers ? "student" : "employee");
  const [entityId, setEntityId] = useState("");

  const { data: studentsData } = useQuery(LIST_STUDENTS, { skip: !hasMembers });
  const { data: employeesData } = useQuery(LIST_EMPLOYEES);

  const options: SelectOption[] = useMemo(() => {
    if (entityType === "student") {
      return ((studentsData?.students ?? []) as GqlStudent[]).map((s) => ({
        value: s.id,
        label: s.user?.name ?? "Unnamed",
        sublabel: s.rollNumber ?? undefined,
      }));
    }
    return ((employeesData?.employees ?? []) as GqlEmployee[]).map((e) => ({
      value: e.id,
      label: e.user?.name ?? "Unnamed",
      sublabel: e.designation ?? undefined,
    }));
  }, [entityType, studentsData, employeesData]);

  function pickType(t: EntityType) {
    setEntityType(t);
    setEntityId("");
  }

  return (
    <Modal title={`Mark ${terms.attendance}`} isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-4">
        {/* Type filter */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Filter</label>
          <div className="flex gap-3">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => pickType(t.key)}
                className={[
                  "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
                  entityType === t.key
                    ? "btn-primary text-white border-primary-600"
                    : "bg-card text-foreground/80 border-gray-300 hover:bg-muted/40",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Searchable person picker */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            {entityType === "student" ? terms.member : "Staff member"}
          </label>
          <SearchableSelect
            options={options}
            value={entityId}
            onChange={setEntityId}
            placeholder={`Select a ${entityType === "student" ? "student" : "staff member"}…`}
            searchPlaceholder={entityType === "student" ? "Search name or roll no…" : "Search name or role…"}
          />
        </div>

        {entityId ? (
          <AttendancePainter
            key={`${entityType}:${entityId}`}
            entityType={entityType}
            entityId={entityId}
            onSaved={onSaved}
          />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Pick someone above to open their attendance calendar.
          </p>
        )}
      </div>
    </Modal>
  );
}
