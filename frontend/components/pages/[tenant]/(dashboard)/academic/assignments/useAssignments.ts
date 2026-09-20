"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_STUDENT_ASSIGNMENTS } from "@/graphql/queries/campus";
import {
  CREATE_STUDENT_ASSIGNMENT,
  UPDATE_STUDENT_ASSIGNMENT,
  PUBLISH_STUDENT_ASSIGNMENT,
  CLOSE_STUDENT_ASSIGNMENT,
  DELETE_STUDENT_ASSIGNMENT,
} from "@/graphql/mutations/campus";
import { LIST_COURSES } from "@/graphql/queries/academic";
import type { GqlAssignment, PickerCourse } from "./types";

/**
 * Data layer for the Assignments page. Every mutation refetches the same
 * filtered list so counts (submissions / graded) stay accurate without
 * hand-patching the cache.
 */
export function useAssignments(filters: { courseId?: string; status?: string }) {
  const variables = {
    courseId: filters.courseId || null,
    status: filters.status || null,
  };
  const refetchQueries = [{ query: LIST_STUDENT_ASSIGNMENTS, variables }];

  const { data, loading, refetch } = useQuery(LIST_STUDENT_ASSIGNMENTS, { variables });
  const { data: courseData } = useQuery(LIST_COURSES);

  const [createMut] = useMutation(CREATE_STUDENT_ASSIGNMENT, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_STUDENT_ASSIGNMENT, { refetchQueries });
  const [publishMut] = useMutation(PUBLISH_STUDENT_ASSIGNMENT, { refetchQueries });
  const [closeMut] = useMutation(CLOSE_STUDENT_ASSIGNMENT, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_STUDENT_ASSIGNMENT, { refetchQueries });

  const assignments: GqlAssignment[] = data?.studentAssignments ?? [];
  const courses: PickerCourse[] = courseData?.courses ?? [];

  return { assignments, courses, loading, refetch, createMut, updateMut, publishMut, closeMut, deleteMut };
}
