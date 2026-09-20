"use client";

import { useMutation } from "@apollo/client";
import { DELETE_MARKS_BY_FILTER } from "@/graphql/mutations/marks";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";

type Filters = {
  studentId?: string;
  subjectId?: string;
  examType?: string;
  status?: string;
};

type FilterLabels = {
  studentName?: string;
  subjectName?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  labels: FilterLabels;
  totalCount: number;
  onDeleted: () => void;
};

export default function BulkDeleteModal({
  isOpen,
  onClose,
  filters,
  labels,
  totalCount,
  onDeleted,
}: Props) {
  const [deleteByFilter, { loading }] = useMutation(DELETE_MARKS_BY_FILTER);

  const hasFilters =
    filters.studentId || filters.subjectId || filters.examType || filters.status;

  const handleConfirm = async () => {
    try {
      const res = await deleteByFilter({
        variables: {
          studentId: filters.studentId ?? null,
          subjectId: filters.subjectId ?? null,
          examType: filters.examType ?? null,
          status: filters.status ?? null,
        },
      });
      const count = res.data?.deleteMarksByFilter ?? 0;
      toast.success(`Deleted ${count} record${count !== 1 ? "s" : ""}`);
      onDeleted();
      onClose();
    } catch {
      toast.error("Failed to delete records");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Delete Marks">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">
            This will permanently delete{" "}
            <strong>{totalCount} record{totalCount !== 1 ? "s" : ""}</strong>.
            This action cannot be undone.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Active filters:</p>
          {hasFilters ? (
            <ul className="text-sm text-gray-600 space-y-1">
              {filters.studentId && (
                <li>
                  <span className="font-medium">Student:</span>{" "}
                  {labels.studentName ?? filters.studentId}
                </li>
              )}
              {filters.subjectId && (
                <li>
                  <span className="font-medium">Subject:</span>{" "}
                  {labels.subjectName ?? filters.subjectId}
                </li>
              )}
              {filters.examType && (
                <li>
                  <span className="font-medium">Assessment Type:</span> {filters.examType}
                </li>
              )}
              {filters.status && (
                <li>
                  <span className="font-medium">Status:</span> {filters.status}
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">
              No filters applied — all marks for this organization will be deleted.
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-danger"
            onClick={handleConfirm}
            disabled={loading || totalCount === 0}
          >
            {loading ? "Deleting..." : `Delete ${totalCount} Record${totalCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
