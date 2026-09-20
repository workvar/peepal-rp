"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { HelpCircle, ListChecks, ToggleRight } from "lucide-react";

import { ASSIGNMENT_QUESTIONS, GET_LEARNING_GOAL } from "@/graphql/queries/learning";
import {
  CREATE_LEARNING_QUESTION,
  UPDATE_LEARNING_QUESTION,
  DELETE_LEARNING_QUESTION,
} from "@/graphql/mutations/learning";
import {
  LearningQuestion,
  QuestionForm,
  QuestionKind,
  emptyQuestionForm,
} from "@/types/pages/learning/page";

export const KIND_LABEL: Record<QuestionKind, string> = {
  mcq: "Single choice",
  multi: "Multiple choice",
  true_false: "True / False",
};

export const KIND_ICON: Record<QuestionKind, typeof HelpCircle> = {
  mcq: HelpCircle,
  multi: ListChecks,
  true_false: ToggleRight,
};

// All quiz-builder state and handlers; the question list and editor consume
// this hook.
export function useQuizBuilder(assignmentId: string, goalId: string) {
  const { data, loading, refetch } = useQuery(ASSIGNMENT_QUESTIONS, {
    variables: { assignmentId },
    fetchPolicy: "cache-and-network",
  });
  const questions: LearningQuestion[] = data?.assignmentQuestions ?? [];

  const refetchQueries = [
    { query: ASSIGNMENT_QUESTIONS, variables: { assignmentId } },
    { query: GET_LEARNING_GOAL, variables: { id: goalId } },
  ];

  const [createQ] = useMutation(CREATE_LEARNING_QUESTION);
  const [updateQ] = useMutation(UPDATE_LEARNING_QUESTION);
  const [deleteQ] = useMutation(DELETE_LEARNING_QUESTION);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(emptyQuestionForm("mcq"));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = (kind: QuestionKind = "mcq") => {
    setForm(emptyQuestionForm(kind));
    setEditingId(null);
    setIsEditorOpen(false);
  };

  const startAdd = () => {
    setForm(emptyQuestionForm("mcq"));
    setEditingId(null);
    setIsEditorOpen(true);
  };

  const startEdit = (q: LearningQuestion) => {
    setForm({
      kind: q.kind,
      prompt: q.prompt,
      options: q.kind === "true_false" ? [] : [...q.options],
      correctAnswers: [...q.correctAnswers],
      points: q.points,
    });
    setEditingId(q.id);
    setIsEditorOpen(true);
  };

  // When the user changes the kind, normalise the options/correctAnswers so
  // they're in a valid shape for that kind.
  const changeKind = (kind: QuestionKind) => {
    setForm((f) => ({
      ...f,
      kind,
      options: kind === "true_false" ? [] : f.options.length >= 2 ? f.options : ["", ""],
      correctAnswers: [],
    }));
  };

  const addOption = () => setForm((f) => ({ ...f, options: [...f.options, ""] }));
  const removeOption = (idx: number) =>
    setForm((f) => ({
      ...f,
      options: f.options.filter((_, i) => i !== idx),
      correctAnswers: f.correctAnswers.filter((s) => s !== String(idx)),
    }));
  const setOption = (idx: number, value: string) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === idx ? value : o)),
    }));

  const toggleCorrect = (idxOrBool: string) => {
    setForm((f) => {
      if (f.kind === "mcq" || f.kind === "true_false") {
        return { ...f, correctAnswers: [idxOrBool] };
      }
      // multi
      const exists = f.correctAnswers.includes(idxOrBool);
      return {
        ...f,
        correctAnswers: exists
          ? f.correctAnswers.filter((s) => s !== idxOrBool)
          : [...f.correctAnswers, idxOrBool],
      };
    });
  };

  // NOTE: handleSave is a plain click handler — NOT a form onSubmit — because
  // this component lives inside another form (the Assignment modal) and nested
  // forms would cause the outer form to be submitted, reloading the page.
  const handleSave = async () => {
    if (saving) return;
    try {
      // Client-side validation mirrors backend validateQuestionInput.
      if (!form.prompt.trim()) {
        toast.error("Enter a question prompt");
        return;
      }
      if (form.kind !== "true_false") {
        if (form.options.length < 2) {
          toast.error("Add at least 2 options");
          return;
        }
        if (form.options.some((o) => !o.trim())) {
          toast.error("Option labels cannot be empty");
          return;
        }
      }
      if (form.kind === "mcq" && form.correctAnswers.length !== 1) {
        toast.error("Select exactly 1 correct answer");
        return;
      }
      if (form.kind === "multi" && form.correctAnswers.length < 1) {
        toast.error("Select at least 1 correct answer");
        return;
      }
      if (form.kind === "true_false" && form.correctAnswers.length !== 1) {
        toast.error("Pick True or False");
        return;
      }

      const input = {
        kind: form.kind,
        prompt: form.prompt,
        options: form.options,
        correctAnswers: form.correctAnswers,
        points: form.points,
      };

      setSaving(true);
      if (editingId) {
        await updateQ({ variables: { id: editingId, input }, refetchQueries });
        toast.success("Question updated");
      } else {
        await createQ({
          variables: { input: { assignmentId, ...input } },
          refetchQueries,
        });
        toast.success("Question added");
      }
      await refetch();
      resetForm();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (q: LearningQuestion) => {
    if (!confirm("Delete this question?")) return;
    try {
      await deleteQ({ variables: { id: q.id }, refetchQueries });
      toast.success("Deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete"));
    }
  };

  // Reset the builder whenever we switch to a different assignment.
  useEffect(() => {
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  return {
    questions, loading,
    editingId, form, setForm, isEditorOpen, saving,
    resetForm, startAdd, startEdit, changeKind,
    addOption, removeOption, setOption, toggleCorrect,
    handleSave, handleDelete,
  };
}

export type QuizBuilderState = ReturnType<typeof useQuizBuilder>;
