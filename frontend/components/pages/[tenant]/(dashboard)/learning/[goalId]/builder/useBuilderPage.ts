"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import { GET_LEARNING_GOAL } from "@/graphql/queries/learning";
import {
  CREATE_LEARNING_SECTION,
  UPDATE_LEARNING_SECTION,
  DELETE_LEARNING_SECTION,
  CREATE_LEARNING_UNIT,
  UPDATE_LEARNING_UNIT,
  DELETE_LEARNING_UNIT,
  UPLOAD_UNIT_VIDEO,
} from "@/graphql/mutations/learning";
import {
  LearningGoal,
  LearningSection,
  LearningItem,
  UnitForm,
  VideoType,
} from "@/types/pages/learning/page";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { useAssignmentHandlers } from "./useAssignmentHandlers";

export type SectionForm = { title: string; orderIndex: number };

const blankUnitForm: UnitForm = {
  title: "",
  description: "",
  videoType: "none",
  videoUrl: "",
  content: "",
};

// All course-builder page state and handlers; the section list and modals
// consume this hook.
export function useBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const tenant = (params?.tenant as string) ?? "";
  const goalId = (params?.goalId as string) ?? "";
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const { data, loading, refetch } = useQuery(GET_LEARNING_GOAL, {
    variables: { id: goalId },
    skip: !goalId,
  });

  const goal: LearningGoal | undefined = data?.learningGoal;

  // Section modal state
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionForm>({ title: "", orderIndex: 0 });

  // Unit modal
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitSectionId, setUnitSectionId] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitForm, setUnitForm] = useState<UnitForm>(blankUnitForm);
  const [unitFile, setUnitFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  // Write / Preview toggle for the markdown reading-material editor.
  const [readingTab, setReadingTab] = useState<"write" | "preview">("write");

  const refetchQueries = useMemo(
    () => [{ query: GET_LEARNING_GOAL, variables: { id: goalId } }],
    [goalId],
  );

  const [createSection] = useMutation(CREATE_LEARNING_SECTION);
  const [updateSection] = useMutation(UPDATE_LEARNING_SECTION);
  const [deleteSection] = useMutation(DELETE_LEARNING_SECTION);

  const [createUnit] = useMutation(CREATE_LEARNING_UNIT);
  const [updateUnit] = useMutation(UPDATE_LEARNING_UNIT);
  const [deleteUnit] = useMutation(DELETE_LEARNING_UNIT);
  const [uploadUnitVideo] = useMutation(UPLOAD_UNIT_VIDEO);

  // Assignment modal state + handlers live in a composed sub-hook.
  const assignment = useAssignmentHandlers(refetchQueries);

  const sections = [...(goal?.sections ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);

  // ── Section handlers ────────────────────────────────────────────────────
  const openCreateSection = () => {
    setEditingSectionId(null);
    setSectionForm({ title: "", orderIndex: sections.length });
    setShowSectionModal(true);
  };
  const openEditSection = (s: LearningSection) => {
    setEditingSectionId(s.id);
    setSectionForm({ title: s.title, orderIndex: s.orderIndex });
    setShowSectionModal(true);
  };
  const saveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSectionId) {
        await updateSection({
          variables: {
            id: editingSectionId,
            input: { title: sectionForm.title, orderIndex: sectionForm.orderIndex },
          },
          refetchQueries,
        });
        toast.success("Section updated");
      } else {
        await createSection({
          variables: {
            input: {
              goalId,
              title: sectionForm.title,
              orderIndex: sectionForm.orderIndex,
            },
          },
          refetchQueries,
        });
        toast.success("Section created");
      }
      setShowSectionModal(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save section"));
    }
  };
  const handleDeleteSection = async (s: LearningSection) => {
    if (!confirm(`Delete section "${s.title}" and all its items?`)) return;
    try {
      await deleteSection({ variables: { id: s.id }, refetchQueries });
      toast.success("Section deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete"));
    }
  };

  // ── Unit handlers ───────────────────────────────────────────────────────
  const openCreateUnit = (sectionId: string) => {
    setUnitSectionId(sectionId);
    setEditingUnitId(null);
    setUnitForm(blankUnitForm);
    setUnitFile(null);
    setShowUnitModal(true);
  };
  const openEditUnit = (sectionId: string, item: LearningItem) => {
    setUnitSectionId(sectionId);
    setEditingUnitId(item.id);
    setUnitForm({
      title: item.title,
      description: item.description ?? "",
      videoType: (item.videoType ?? "none") as VideoType,
      videoUrl: item.videoUrl ?? "",
      content: item.content ?? "",
    });
    setUnitFile(null);
    setShowUnitModal(true);
  };
  const uploadVideoFor = async (unitId: string, file: File) => {
    const { data: res } = await uploadUnitVideo({
      variables: { unitId, filename: file.name, contentType: file.type || "video/mp4" },
    });
    const raw: string = res?.uploadUnitVideo?.uploadUrl;
    if (!raw) throw new Error("Upload URL not returned");
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    const uploadUrl = raw.startsWith("http") ? raw : `${base}${raw}`;
    const fd = new FormData();
    fd.append("file", file);
    // Auth rides on the httpOnly cookie; no Bearer header needed.
    const resp = await fetch(uploadUrl, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Upload failed: ${resp.status} ${text}`);
    }
  };
  const saveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitSectionId) return;
    try {
      setUploading(true);
      const isExternal = unitForm.videoType === "external";
      const input = {
        sectionId: unitSectionId,
        title: unitForm.title,
        description: unitForm.description || null,
        videoType: unitForm.videoType,
        videoUrl: isExternal ? (unitForm.videoUrl || null) : null,
        content: unitForm.content || null,
        orderIndex: 0, // server appends; see resolver
      };
      let unitId = editingUnitId;
      if (editingUnitId) {
        await updateUnit({
          variables: {
            id: editingUnitId,
            input: {
              title: input.title,
              description: input.description,
              videoType: input.videoType,
              videoUrl: input.videoUrl,
              content: input.content,
            },
          },
          refetchQueries,
        });
      } else {
        const { data: res } = await createUnit({ variables: { input }, refetchQueries });
        unitId = res?.createLearningUnit?.id ?? null;
      }
      if (unitForm.videoType === "upload" && unitFile && unitId) {
        await uploadVideoFor(unitId, unitFile);
      }
      await refetch();
      toast.success(editingUnitId ? "Unit updated" : "Unit created");
      setShowUnitModal(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save unit"));
    } finally {
      setUploading(false);
    }
  };
  const handleDeleteUnit = async (item: LearningItem) => {
    if (!confirm(`Delete unit "${item.title}"?`)) return;
    try {
      await deleteUnit({ variables: { id: item.id }, refetchQueries });
      toast.success("Unit deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete unit"));
    }
  };

  return {
    router, tenant, goalId, isAdmin,
    goal, loading, sections,
    showSectionModal, setShowSectionModal, editingSectionId, sectionForm, setSectionForm,
    showUnitModal, setShowUnitModal, editingUnitId, unitForm, setUnitForm,
    unitFile, setUnitFile, uploading, readingTab, setReadingTab,
    openCreateSection, openEditSection, saveSection, handleDeleteSection,
    openCreateUnit, openEditUnit, saveUnit, handleDeleteUnit,
    ...assignment,
  };
}

export type BuilderPageState = ReturnType<typeof useBuilderPage>;
