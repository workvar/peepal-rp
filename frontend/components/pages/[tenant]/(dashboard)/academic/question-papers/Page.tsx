"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { downloadBlobResponse } from "@/functions/downloadBlob";
import { examCellAPI } from "@/api/services/examCell";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useQuestionPapers } from "./useQuestionPapers";
import GenerateModal from "./GenerateModal";
import PaperCard from "./PaperCard";
import type { GenerateForm, GqlQuestionPaper } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function QuestionPapersPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canWrite =
    user?.role === "admin" || user?.role === "super_admin" || user?.role === "teacher";

  const {
    courses,
    curriculumSubjects,
    examTypes,
    papers,
    units,
    loading,
    scope,
    setScope,
    generateMut,
    finalizeMut,
    deleteMut,
  } = useQuestionPapers();

  const [showGenerate, setShowGenerate] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const handleGenerate = async (form: GenerateForm) => {
    // Only non-zero buckets and caps go to the API — a blank field means "no
    // constraint", not "zero of these".
    const byDifficulty = (
      [
        ["easy", form.easy_marks],
        ["medium", form.medium_marks],
        ["hard", form.hard_marks],
      ] as const
    )
      .map(([difficulty, raw]) => ({ difficulty, marks: parseFloat(raw) || 0 }))
      .filter((d) => d.marks > 0);

    const typeMix = (
      [
        ["mcq", form.mcq_count],
        ["short", form.short_count],
        ["long", form.long_count],
        ["numeric", form.numeric_count],
      ] as const
    )
      .map(([questionType, raw]) => ({ questionType, count: parseInt(raw, 10) || 0 }))
      .filter((t) => t.count > 0);

    const input = {
      title: form.title.trim(),
      examTypeId: form.exam_type_id || null,
      curriculumSubjectId: scope.curriculumSubjectId,
      totalMarks: parseFloat(form.total_marks) || 0,
      durationMinutes: parseInt(form.duration_minutes, 10) || null,
      instructions: form.instructions.trim() || null,
      byDifficulty: byDifficulty.length > 0 ? byDifficulty : null,
      units: form.units.length > 0 ? form.units : null,
      typeMix: typeMix.length > 0 ? typeMix : null,
      seed: form.seed ? parseInt(form.seed, 10) : null,
    };

    try {
      const res = await generateMut({ variables: { input } });
      const generated = res.data?.generateQuestionPaper;
      toast.success(`Generated ${generated?.items?.length ?? 0} questions`);
      setShowGenerate(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate the paper");
    }
  };

  const handleDownload = async (paper: GqlQuestionPaper) => {
    try {
      const res = await examCellAPI.downloadPaperPDF(paper.id);
      downloadBlobResponse(res.data, `${paper.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    } catch {
      toast.error("Failed to download the paper");
    }
  };

  const handleFinalize = (paper: GqlQuestionPaper) => {
    setConfirmState({
      title: "Finalize Paper",
      message:
        "Finalizing locks this paper. It will print without the DRAFT watermark and can no longer be deleted. This cannot be undone.",
      confirmLabel: "Finalize",
      onConfirm: async () => {
        await finalizeMut({ variables: { id: paper.id } });
        toast.success("Paper finalized");
      },
    });
  };

  const handleDelete = (paper: GqlQuestionPaper) => {
    setConfirmState({
      title: "Delete Paper",
      message: `“${paper.title}” and its questions will be removed. The question bank is unaffected. This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteMut({ variables: { id: paper.id } });
        toast.success("Deleted");
      },
    });
  };

  return (
    <div>
      <Header
        title="Question Papers"
        subtitle="Generate papers from the question bank by difficulty, unit and type"
        action={
          canWrite && scope.curriculumSubjectId ? (
            <Can module="question-papers" action="create">
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => setShowGenerate(true)}
              >
                <Sparkles size={16} /> Generate Paper
              </button>
            </Can>
          ) : undefined
        }
      />

      <div className="card mb-4 grid gap-3 md:grid-cols-2">
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
      </div>

      {!scope.curriculumSubjectId ? (
        <div className="card py-12 text-center text-muted-foreground/70">
          Pick a course and subject to see its generated papers.
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : papers.length === 0 ? (
        <div className="card py-12 text-center text-muted-foreground/70">
          No papers generated yet for this subject. Make sure the question bank has questions, then
          generate one.
        </div>
      ) : (
        <div className="space-y-3">
          {papers.map((p) => (
            <PaperCard
              key={p.id}
              paper={p}
              onDownload={handleDownload}
              onFinalize={handleFinalize}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <GenerateModal
        isOpen={showGenerate}
        onClose={() => setShowGenerate(false)}
        examTypes={examTypes}
        units={units}
        onGenerate={handleGenerate}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
