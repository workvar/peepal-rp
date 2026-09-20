"use client";

import Modal from "@/components/ui/Modal";
import QuizBuilder from "./QuizBuilder";
import { AssessmentType } from "@/types/pages/learning/page";
import type { BuilderPageState } from "./useBuilderPage";

// Section create/edit modal.
export function SectionModal({ page }: { page: BuilderPageState }) {
  const {
    showSectionModal, setShowSectionModal,
    editingSectionId, sectionForm, setSectionForm, saveSection,
  } = page;

  return (
    <Modal
      title={editingSectionId ? "Edit Section" : "New Section"}
      isOpen={showSectionModal}
      onClose={() => setShowSectionModal(false)}
    >
      <form onSubmit={saveSection} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Title</label>
          <input
            className="input-field"
            value={sectionForm.title}
            onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Order index
          </label>
          <input
            type="number"
            min={0}
            className="input-field"
            value={sectionForm.orderIndex}
            onChange={(e) =>
              setSectionForm({ ...sectionForm, orderIndex: parseInt(e.target.value || "0", 10) })
            }
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            {editingSectionId ? "Save" : "Create"}
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => setShowSectionModal(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Assignment create/edit modal; embeds the QuizBuilder when editing a
// score-based assignment.
export function AssignmentModal({ page }: { page: BuilderPageState }) {
  const {
    goalId,
    showAssignModal, setShowAssignModal,
    editingAssignId, assignForm, setAssignForm, saveAssignment,
  } = page;

  return (
    <Modal
      title={editingAssignId ? "Edit Assignment" : "New Assignment"}
      isOpen={showAssignModal}
      onClose={() => setShowAssignModal(false)}
    >
      <form onSubmit={saveAssignment} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Title</label>
          <input
            className="input-field"
            value={assignForm.title}
            onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Description</label>
          <textarea
            className="input-field"
            rows={3}
            value={assignForm.description}
            onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Assessment type
            </label>
            <select
              className="input-field"
              value={assignForm.assessmentType}
              onChange={(e) =>
                setAssignForm({
                  ...assignForm,
                  assessmentType: e.target.value as AssessmentType,
                })
              }
            >
              <option value="completion">Completion (self-mark)</option>
              <option value="score">Score (quiz)</option>
            </select>
          </div>
          {assignForm.assessmentType === "score" && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Pass mark (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                className="input-field"
                value={assignForm.passScore}
                onChange={(e) =>
                  setAssignForm({
                    ...assignForm,
                    passScore: parseInt(e.target.value || "0", 10),
                  })
                }
                required
              />
              <p className="text-xs text-muted-foreground/70 mt-1">
                Learners pass when their quiz percentage ≥ this value.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            {editingAssignId ? "Save" : "Create"}
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => setShowAssignModal(false)}
          >
            Cancel
          </button>
        </div>

        {/* Quiz builder appears once the assignment exists. When creating a
            new assignment the builder is hidden until Save — the user can
            reopen it via the pencil icon to add questions. */}
        {editingAssignId && assignForm.assessmentType === "score" && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <QuizBuilder assignmentId={editingAssignId} goalId={goalId} />
          </div>
        )}
        {editingAssignId && assignForm.assessmentType !== "score" && (
          <div className="mt-2 text-xs italic text-muted-foreground/70">
            Switch to "Score (quiz)" to attach quiz questions.
          </div>
        )}
      </form>
    </Modal>
  );
}
