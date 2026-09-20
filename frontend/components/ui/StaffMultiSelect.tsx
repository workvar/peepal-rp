"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { LIST_EMPLOYEES } from "@/graphql/queries/employees";
import PeopleMultiSelect, { type PersonOption } from "./PeopleMultiSelect";
import type { GqlEmployee } from "@/types/pages/employees/page";

// Multi-select of staff (employees), searchable by name or employee ID.
interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
}

export default function StaffMultiSelect({ value, onChange }: Props) {
  const { data, loading } = useQuery(LIST_EMPLOYEES, { fetchPolicy: "cache-and-network" });
  const options: PersonOption[] = useMemo(
    () => ((data?.employees ?? []) as GqlEmployee[]).map((e) => ({ id: e.id, name: e.user?.name ?? "Unknown", sub: e.employeeId })),
    [data]
  );
  return (
    <PeopleMultiSelect
      value={value}
      onChange={onChange}
      options={options}
      loading={loading}
      placeholder="Search staff by name or employee ID…"
    />
  );
}
