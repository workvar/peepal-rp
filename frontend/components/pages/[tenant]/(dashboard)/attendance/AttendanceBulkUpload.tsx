"use client";

import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { BulkUploadButton } from "@/components/ui/BulkUpload";
import type { DynamicFieldConfig } from "@/components/ui/BulkUpload/EditableTable";
import { useTenantType } from "@/store/hooks/useTerminology";
import { moduleAllowedForIndustry } from "@/lib/access";

const LIST_EMPLOYEES_MINIMAL = gql`
  query ListEmployeesMinimal {
    employees {
      id
      employeeId
      user { name }
    }
  }
`;

const LIST_STUDENTS_MINIMAL = gql`
  query ListStudentsMinimal {
    students {
      id
      rollNumber
      user { name }
    }
  }
`;

interface Props {
  onFinished?: (s: { successful: number; failed: number; total: number }) => void;
}

export default function AttendanceBulkUpload({ onFinished }: Props) {
  // The students query is rejected outside education (the module does not
  // exist there), so skip it rather than firing a request that 403s.
  const hasMembers = moduleAllowedForIndustry("students", useTenantType());

  const { data: empData } = useQuery(LIST_EMPLOYEES_MINIMAL);
  const { data: stuData } = useQuery(LIST_STUDENTS_MINIMAL, { skip: !hasMembers });

  const employeeOpts = (empData?.employees ?? []).map((e: { id: string; employeeId: string; user: { name: string } }) => ({
    value: e.id,
    label: `${e.user?.name ?? "Unknown"} (${e.employeeId})`,
  }));

  const studentOpts = (stuData?.students ?? []).map((s: { id: string; rollNumber: string; user: { name: string } }) => ({
    value: s.id,
    label: `${s.user?.name ?? "Unknown"} (${s.rollNumber})`,
  }));

  const entityIdConfig: DynamicFieldConfig = {
    searchable: true,
    options: (row) => row.entity_type === "student" ? studentOpts : employeeOpts,
  };

  return (
    <BulkUploadButton
      resource="attendance"
      onFinished={onFinished}
      dynamicOptions={{ entity_id: entityIdConfig }}
    />
  );
}
