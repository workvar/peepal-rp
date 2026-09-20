"use client";

// Course → subject → filters selector that scopes the question bank. Split out
// of Page.tsx because it is the only stateful chrome on the page and the
// papers page uses the same course/subject pair.

import type { GqlCourseRef, GqlCurriculumSubject } from "./types";
import { DIFFICULTIES, QUESTION_TYPES } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function ScopePicker({
  courses,
  curriculumSubjects,
  units,
  scope,
  setScope,
}: {
  courses: GqlCourseRef[];
  curriculumSubjects: GqlCurriculumSubject[];
  units: string[];
  scope: {
    courseId: string;
    curriculumSubjectId: string;
    unit: string;
    difficulty: string;
    questionType: string;
  };
  setScope: {
    selectCourse: (id: string) => void;
    selectSubject: (id: string) => void;
    setUnit: (v: string) => void;
    setDifficulty: (v: string) => void;
    setQuestionType: (v: string) => void;
  };
}) {
  return (
    <div className="card mb-4 grid gap-3 md:grid-cols-5">
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Course</span>
        <SearchableSelect
          value={scope.courseId}
          onChange={(v) => setScope.selectCourse(v)}
          options={courses.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
          placeholder="Select a course…"
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Subject</span>
        <SearchableSelect
          value={scope.curriculumSubjectId}
          onChange={(v) => setScope.selectSubject(v)}
          disabled={!scope.courseId}
          options={curriculumSubjects.map((cs) => ({
            value: cs.id,
            label: `Sem ${cs.semesterNumber} — ${cs.subject.name} (${cs.subject.code})`,
          }))}
          placeholder={scope.courseId ? "Select a subject…" : "Pick a course first"}
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Unit</span>
        <SearchableSelect
          value={scope.unit}
          onChange={(v) => setScope.setUnit(v)}
          disabled={!scope.curriculumSubjectId}
          options={units.map((u) => ({ value: u, label: u }))}
          placeholder="All units"
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Difficulty</span>
        <select
          className="input-field w-full"
          value={scope.difficulty}
          onChange={(e) => setScope.setDifficulty(e.target.value)}
          disabled={!scope.curriculumSubjectId}
        >
          <option value="">All</option>
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Type</span>
        <select
          className="input-field w-full"
          value={scope.questionType}
          onChange={(e) => setScope.setQuestionType(e.target.value)}
          disabled={!scope.curriculumSubjectId}
        >
          <option value="">All</option>
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
