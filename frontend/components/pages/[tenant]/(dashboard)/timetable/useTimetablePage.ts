"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import { DAYS, type DayOfWeek } from "@/store/slices/timetableSlice";
import { LIST_TIMETABLE } from "@/graphql/queries/timetable";
import {
  CREATE_TIMETABLE_SLOT,
  UPDATE_TIMETABLE_SLOT,
  DELETE_TIMETABLE_SLOT,
} from "@/graphql/mutations/timetable";
import { LIST_COURSES } from "@/graphql/queries/students";
import { LIST_SUBJECTS } from "@/graphql/queries/academic";
import { type ConfirmState } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import {
  type TimetableSlot,
  type SubjectOption,
  type CourseOption,
  type SlotForm,
  EMPTY_FORM,
} from "./types";

// All timetable page state and handlers; the grid and dialogs consume this hook.
export function useTimetablePage() {
  const user      = useAppSelector((s) => s.auth.user);
  const isAdmin   = user?.role === "admin" || user?.role === "super_admin";
  const isTeacher = user?.role === "teacher";
  const canEdit   = isAdmin || isTeacher;

  // Filter state
  const [courseId,  setCourseId]  = useState("");
  const [semester,  setSemester]  = useState("1");
  const [section,   setSection]   = useState("");

  // Modal state
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [form,        setForm]        = useState<SlotForm>(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: coursesData } = useQuery<{ courses: CourseOption[] }>(LIST_COURSES);
  const courses = coursesData?.courses ?? [];

  const { data: subjectsData } = useQuery<{ subjects: SubjectOption[] }>(LIST_SUBJECTS);
  const subjects = subjectsData?.subjects ?? [];

  const { data, loading, refetch } = useQuery<{ timetable: TimetableSlot[] }>(LIST_TIMETABLE, {
    variables: {
      courseId:  courseId  || undefined,
      semester:  semester  ? Number(semester) : undefined,
      section:   section   || undefined,
    },
    skip: !courseId,
  });
  const slots = data?.timetable ?? [];

  // ── Mutations ────────────────────────────────────────────────────────────

  const [createSlot] = useMutation(CREATE_TIMETABLE_SLOT, {
    onCompleted: () => refetch(),
  });

  const [updateSlot] = useMutation(UPDATE_TIMETABLE_SLOT, {
    onCompleted: () => refetch(),
  });

  const [deleteSlot] = useMutation(DELETE_TIMETABLE_SLOT, {
    onCompleted: () => refetch(),
  });

  // ── Grid: group slots by day ──────────────────────────────────────────────

  const slotsByDay = DAYS.reduce((acc, day) => {
    acc[day] = slots
      .filter((s) => s.dayOfWeek === day)
      .sort((a, b) => a.periodNumber - b.periodNumber);
    return acc;
  }, {} as Record<DayOfWeek, TimetableSlot[]>);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = (day?: DayOfWeek) => {
    setEditingSlot(null);
    setForm({ ...EMPTY_FORM, dayOfWeek: day ?? "Monday" });
    setDialogOpen(true);
  };

  const openEdit = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setForm({
      dayOfWeek:    slot.dayOfWeek,
      periodNumber: String(slot.periodNumber),
      startTime:    slot.startTime,
      endTime:      slot.endTime,
      subjectId:    slot.subjectId,
      room:         slot.room ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subjectId) { toast.error("Please select a subject"); return; }
    if (!courseId)       { toast.error("Please select a course first"); return; }

    setSaving(true);
    const input = {
      courseId,
      subjectId:    form.subjectId,
      dayOfWeek:    form.dayOfWeek,
      periodNumber: parseInt(form.periodNumber),
      startTime:    form.startTime,
      endTime:      form.endTime,
      semester:     parseInt(semester),
      section,
      room:         form.room,
    };

    try {
      if (editingSlot) {
        await updateSlot({ variables: { id: editingSlot.id, input } });
        toast.success("Slot updated");
      } else {
        await createSlot({ variables: { input } });
        toast.success("Slot added");
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save slot";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (slot: TimetableSlot) => {
    setConfirmState({
      title: "Delete Slot",
      message: `Remove ${slot.subject?.name ?? "this slot"} on ${slot.dayOfWeek} from the timetable?`,
      variant: "danger",
      confirmLabel: "Remove",
      onConfirm: async () => {
        try {
          await deleteSlot({ variables: { id: slot.id } });
          toast.success("Slot removed");
        } catch {
          toast.error("Failed to remove slot");
        }
      },
    });
  };

  return {
    canEdit,
    courseId, setCourseId, semester, setSemester, section, setSection,
    dialogOpen, setDialogOpen, editingSlot, form, setForm, saving,
    confirmState, setConfirmState,
    courses, subjects, slots, slotsByDay, loading, refetch,
    openCreate, openEdit, handleSave, handleDelete,
  };
}

export type TimetablePageState = ReturnType<typeof useTimetablePage>;
