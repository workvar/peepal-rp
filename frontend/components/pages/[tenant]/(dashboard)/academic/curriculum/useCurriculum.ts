"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_COURSES } from "@/graphql/queries/academic";
import { SET_CURRICULUM_SUBJECTS } from "@/graphql/mutations/academic";
import type { GqlCourse } from "./types";

export function useCurriculum() {
  const { data: coursesData, loading: coursesLoading } = useQuery(LIST_COURSES);
  const courses: GqlCourse[] = coursesData?.courses ?? [];

  const [setSubjectsMut, { loading: clearing }] = useMutation(SET_CURRICULUM_SUBJECTS);

  // Clear all semesters for a set of courses (bulk delete).
  const clearCourses = async (courseIds: string[]) => {
    for (const cid of courseIds) {
      const course = courses.find((c) => c.id === cid);
      if (!course) continue;
      const total = course.totalSemesters || (course.durationYears ? course.durationYears * 2 : 0);
      for (let sem = 1; sem <= total; sem++) {
        await setSubjectsMut({
          variables: { input: { courseId: cid, semesterNumber: sem, subjectIds: [] } },
        });
      }
    }
  };

  return { courses, coursesLoading, clearCourses, clearing };
}
