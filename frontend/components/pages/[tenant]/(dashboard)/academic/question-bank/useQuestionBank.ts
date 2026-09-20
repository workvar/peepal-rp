"use client";

// Data for the Question Bank page. Questions hang off a curriculum subject, so
// the page walks course → semester subject → questions. The scope selection
// lives here rather than in the page so the papers page can reuse the same
// shape later.

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_COURSES, CURRICULUM } from "@/graphql/queries/academic";
import { QUESTION_BANK } from "@/graphql/queries/exam-cell";
import {
  CREATE_QUESTION_BANK_ITEM,
  UPDATE_QUESTION_BANK_ITEM,
  DELETE_QUESTION_BANK_ITEM,
} from "@/graphql/mutations/exam-cell";
import type { GqlCourseRef, GqlCurriculumSubject, GqlQuestion } from "./types";

export function useQuestionBank() {
  const [courseId, setCourseId] = useState("");
  const [curriculumSubjectId, setCurriculumSubjectId] = useState("");
  const [unit, setUnit] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questionType, setQuestionType] = useState("");

  const { data: courseData } = useQuery(LIST_COURSES);
  const courses: GqlCourseRef[] = courseData?.courses ?? [];

  const { data: curriculumData } = useQuery(CURRICULUM, {
    variables: { courseId },
    skip: !courseId,
  });
  const curriculumSubjects: GqlCurriculumSubject[] = curriculumData?.curriculum ?? [];

  const variables = {
    curriculumSubjectId,
    unit: unit || null,
    difficulty: difficulty || null,
    questionType: questionType || null,
    includeInactive: true,
  };

  const { data, loading, refetch } = useQuery(QUESTION_BANK, {
    variables,
    skip: !curriculumSubjectId,
  });
  const questions: GqlQuestion[] = data?.questionBank ?? [];

  // Refetching the exact active filter combination keeps the list honest after
  // a write without a blanket cache reset.
  const refetchQueries = [{ query: QUESTION_BANK, variables }];
  const [createMut] = useMutation(CREATE_QUESTION_BANK_ITEM, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_QUESTION_BANK_ITEM, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_QUESTION_BANK_ITEM, { refetchQueries });

  // The selected subject's syllabus units feed the unit dropdown, so authors
  // tag questions with labels the generator will actually recognise.
  const selected = useMemo(
    () => curriculumSubjects.find((c) => c.id === curriculumSubjectId) ?? null,
    [curriculumSubjects, curriculumSubjectId],
  );
  const units = useMemo(() => {
    const fromSyllabus = (selected?.subject.units ?? []).map((u) => u.title).filter(Boolean);
    // Include any unit already used by a question but missing from the
    // syllabus, so a filter never hides rows it cannot offer.
    const fromQuestions = questions.map((q) => q.unit ?? "").filter(Boolean);
    return Array.from(new Set([...fromSyllabus, ...fromQuestions]));
  }, [selected, questions]);

  const selectCourse = (id: string) => {
    setCourseId(id);
    setCurriculumSubjectId("");
    setUnit("");
  };

  const selectSubject = (id: string) => {
    setCurriculumSubjectId(id);
    setUnit("");
  };

  return {
    courses,
    curriculumSubjects,
    questions,
    units,
    selected,
    loading,
    refetch,
    scope: { courseId, curriculumSubjectId, unit, difficulty, questionType },
    setScope: { selectCourse, selectSubject, setUnit, setDifficulty, setQuestionType },
    createMut,
    updateMut,
    deleteMut,
  };
}
