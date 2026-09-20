"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { LIST_STUDENTS } from "@/graphql/queries/students";
import PeopleMultiSelect, { type PersonOption } from "./PeopleMultiSelect";
import type { GqlStudent } from "@/types/pages/students/page";

// Multi-select of students, searchable by name or roll number.
interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
}

export default function StudentMultiSelect({ value, onChange }: Props) {
  const { data, loading } = useQuery(LIST_STUDENTS, { fetchPolicy: "cache-and-network" });
  const options: PersonOption[] = useMemo(
    () => ((data?.students ?? []) as GqlStudent[]).map((s) => ({ id: s.id, name: s.user?.name ?? "Unknown", sub: s.rollNumber })),
    [data]
  );
  return (
    <PeopleMultiSelect
      value={value}
      onChange={onChange}
      options={options}
      loading={loading}
      placeholder="Search students by name or roll number…"
    />
  );
}
