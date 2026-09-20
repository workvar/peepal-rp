"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client";
import { CURRICULUM, LIST_SUBJECTS } from "@/graphql/queries/academic";
import { SET_CURRICULUM_SUBJECTS } from "@/graphql/mutations/academic";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SemesterCard from "./SemesterCard";
import type { GqlCourse, GqlCurriculumSubject, GqlPickSubject } from "./types";

type Props = {
  course: GqlCourse;
  canEdit: boolean;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
};

export default function CourseAccordion({ course, canEdit, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  const { data: curData, loading: curLoading, refetch } = useQuery(CURRICULUM, {
    variables: { courseId: course.id },
    skip: !open,
  });
  const { data: subjData } = useQuery(LIST_SUBJECTS, {
    variables: { departmentId: course.departmentId || undefined },
    skip: !open,
  });
  const [setSubjectsMut, { loading: saving }] = useMutation(SET_CURRICULUM_SUBJECTS);

  const curriculum: GqlCurriculumSubject[] = curData?.curriculum ?? [];
  const pickSubjects: GqlPickSubject[] = subjData?.subjects ?? [];

  const total = course.totalSemesters || (course.durationYears ? course.durationYears * 2 : 0);
  const years = course.durationYears && course.durationYears > 0
    ? course.durationYears
    : total ? Math.ceil(total / 2) : 0;
  const semPerYear = years > 0 && total > 0 ? Math.max(1, Math.round(total / years)) : 2;

  const yearBlocks = useMemo(() => {
    const blocks: { year: number; semesters: number[] }[] = [];
    for (let y = 1; y <= years; y++) {
      const sems: number[] = [];
      for (let s = (y - 1) * semPerYear + 1; s <= Math.min(y * semPerYear, total); s++) sems.push(s);
      if (sems.length) blocks.push({ year: y, semesters: sems });
    }
    return blocks;
  }, [years, semPerYear, total]);

  const bySemester = useMemo(() => {
    const m = new Map<number, GqlCurriculumSubject[]>();
    for (const c of curriculum) {
      const arr = m.get(c.semesterNumber) ?? [];
      arr.push(c);
      m.set(c.semesterNumber, arr);
    }
    return m;
  }, [curriculum]);

  const saveSemester = async (semesterNumber: number, subjectIds: string[]) => {
    await setSubjectsMut({ variables: { input: { courseId: course.id, semesterNumber, subjectIds } } });
    await refetch();
  };

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors">
        {canEdit && (
          <input
            type="checkbox"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onSelect(course.id, e.target.checked)}
            className="w-4 h-4 accent-primary shrink-0"
          />
        )}
        <button
          className="flex items-center gap-3 flex-1 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="text-muted-foreground">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          <span className="font-semibold text-foreground">{course.name}</span>
          <span className="text-xs text-muted-foreground font-mono">({course.code})</span>
          {course.department?.name && (
            <span className="text-xs text-muted-foreground/60 ml-auto shrink-0">
              {course.department.name}
            </span>
          )}
          {total > 0 && (
            <span className="text-xs text-muted-foreground/60 ml-2 shrink-0">
              {total} sem
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-border/50">
          {curLoading && <LoadingSpinner />}
          {!curLoading && total === 0 && (
            <p className="text-sm text-muted-foreground/70 py-4 text-center">
              No duration set for this course. Edit the course to add years and semesters.
            </p>
          )}
          {!curLoading && total > 0 && (
            <div className="space-y-4 mt-2">
              {yearBlocks.map((yb) => (
                <div key={yb.year}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Year {yb.year}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {yb.semesters.map((sem) => (
                      <SemesterCard
                        key={sem}
                        semesterNumber={sem}
                        assigned={bySemester.get(sem) ?? []}
                        allSubjects={pickSubjects}
                        canEdit={canEdit}
                        onSave={(ids) => saveSemester(sem, ids)}
                        saving={saving}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
