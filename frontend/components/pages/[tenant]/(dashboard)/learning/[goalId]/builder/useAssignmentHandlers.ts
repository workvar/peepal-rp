"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import type { InternalRefetchQueriesInclude } from "@apollo/client";
import {
  CREATE_LEARNING_ASSIGNMENT,
  UPDATE_LEARNING_ASSIGNMENT,
  DELETE_LEARNING_ASSIGNMENT,
} from "@/graphql/mutations/learning";
import {
  LearningItem,
  AssignmentForm,
  AssessmentType,
} from "@/types/pages/learning/page";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

const blankAssignmentForm: AssignmentForm = {
  title: "",
  description: "",
  assessmentType: "completion",
  passScore: 0,
};

// Assignment modal state and CRUD handlers; composed into useBuilderPage.
export function useAssignmentHandlers(refetchQueries: InternalRefetchQueriesInclude) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSectionId, setAssignSectionId] = useState<string | null>(null);
  const [editingAssignId, setEditingAssignId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<AssignmentForm>(blankAssignmentForm);

  const [createAssignment] = useMutation(CREATE_LEARNING_ASSIGNMENT);
  const [updateAssignment] = useMutation(UPDATE_LEARNING_ASSIGNMENT);
  const [deleteAssignment] = useMutation(DELETE_LEARNING_ASSIGNMENT);

  const openCreateAssignment = (sectionId: string) => {
    setAssignSectionId(sectionId);
    setEditingAssignId(null);
    setAssignForm(blankAssignmentForm);
    setShowAssignModal(true);
  };
  const openEditAssignment = (sectionId: string, item: LearningItem) => {
    setAssignSectionId(sectionId);
    setEditingAssignId(item.id);
    setAssignForm({
      title: item.title,
      description: item.description ?? "",
      assessmentType: (item.assessmentType ?? "completion") as AssessmentType,
      passScore: item.passScore ?? 0,
    });
    setShowAssignModal(true);
  };
  const saveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSectionId) return;
    const isScore = assignForm.assessmentType === "score";
    try {
      if (editingAssignId) {
        await updateAssignment({
          variables: {
            id: editingAssignId,
            input: {
              title: assignForm.title,
              description: assignForm.description || null,
              assessmentType: assignForm.assessmentType,
              passScore: isScore ? Number(assignForm.passScore) : null,
            },
          },
          refetchQueries,
        });
        toast.success("Assignment updated");
      } else {
        await createAssignment({
          variables: {
            input: {
              sectionId: assignSectionId,
              title: assignForm.title,
              description: assignForm.description || null,
              assessmentType: assignForm.assessmentType,
              passScore: isScore ? Number(assignForm.passScore) : null,
              orderIndex: 0,
            },
          },
          refetchQueries,
        });
        toast.success("Assignment created");
      }
      setShowAssignModal(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save assignment"));
    }
  };
  const handleDeleteAssignment = async (item: LearningItem) => {
    if (!confirm(`Delete assignment "${item.title}"?`)) return;
    try {
      await deleteAssignment({ variables: { id: item.id }, refetchQueries });
      toast.success("Assignment deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete"));
    }
  };

  return {
    showAssignModal, setShowAssignModal, editingAssignId, assignForm, setAssignForm,
    openCreateAssignment, openEditAssignment, saveAssignment, handleDeleteAssignment,
  };
}
