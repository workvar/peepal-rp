"use client";

// Data for the Question Papers page: the same course → subject scope the
// question bank uses, plus the papers generated for that subject.

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_COURSES, CURRICULUM, LIST_EXAM_TYPES } from "@/graphql/queries/academic";
import { QUESTION_PAPERS } from "@/graphql/queries/exam-cell";
import {
  GENERATE_QUESTION_PAPER,
  FINALIZE_QUESTION_PAPER,
  DELETE_QUESTION_PAPER,
} from "@/graphql/mutations/exam-cell";
import type { GqlCourseRef, GqlCurriculumSubject, GqlExamTypeRef, GqlQuestionPaper } from "./types";

export function useQuestionPapers() {
  const [courseId, setCourseId] = useState("");
  const [curriculumSubjectId, setCurriculumSubjectId] = useState("");

  const { data: courseData } = useQuery(LIST_COURSES);
  const courses: GqlCourseRef[] = courseData?.courses ?? [];

  const { data: curriculumData } = useQuery(CURRICULUM, {
    variables: { courseId },
    skip: !courseId,
  });
  const curriculumSubjects: GqlCurriculumSubject[] = curriculumData?.curriculum ?? [];

  const { data: examTypeData } = useQuery(LIST_EXAM_TYPES, { variables: {} });
  const examTypes: GqlExamTypeRef[] = examTypeData?.examTypes ?? [];

  const variables = { curriculumSubjectId: curriculumSubjectId || null, status: null };
  const { data, loading, refetch } = useQuery(QUESTION_PAPERS, {
    variables,
    skip: !curriculumSubjectId,
  });
  const papers: GqlQuestionPaper[] = data?.questionPapers ?? [];

  const refetchQueries = [{ query: QUESTION_PAPERS, variables }];
  const [generateMut] = useMutation(GENERATE_QUESTION_PAPER, { refetchQueries });
  const [finalizeMut] = useMutation(FINALIZE_QUESTION_PAPER, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_QUESTION_PAPER, { refetchQueries });

  const selected = useMemo(
    () => curriculumSubjects.find((c) => c.id === curriculumSubjectId) ?? null,
    [curriculumSubjects, curriculumSubjectId],
  );
  // The rule builder offers the subject's syllabus units as the unit spread.
  const units = useMemo(
    () => (selected?.subject.units ?? []).map((u) => u.title).filter(Boolean),
    [selected],
  );

  const selectCourse = (id: string) => {
    setCourseId(id);
    setCurriculumSubjectId("");
  };

  return {
    courses,
    curriculumSubjects,
    examTypes,
    papers,
    units,
    selected,
    loading,
    refetch,
    scope: { courseId, curriculumSubjectId },
    setScope: { selectCourse, selectSubject: setCurriculumSubjectId },
    generateMut,
    finalizeMut,
    deleteMut,
  };
}
