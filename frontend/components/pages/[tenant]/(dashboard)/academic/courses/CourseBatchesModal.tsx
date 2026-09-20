"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { CREATE_COURSE_BATCH, DELETE_COURSE_BATCH } from "@/graphql/mutations/academic";
import { LIST_COURSE_BATCHES } from "@/graphql/queries/academic";
import Modal from "@/components/ui/Modal";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";

interface CourseBatch {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
}

interface Props {
  courseId: string;
  courseName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CourseBatchesModal({ courseId, courseName, isOpen, onClose }: Props) {
  const [startYear, setStartYear] = useState(String(new Date().getFullYear()));
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const refetchQueries = [{ query: LIST_COURSE_BATCHES, variables: { courseId } }];

  const { data, loading: loadingBatches } = useQuery(LIST_COURSE_BATCHES, {
    variables: { courseId },
    skip: !isOpen,
  });
  const batches: CourseBatch[] = data?.courseBatches ?? [];

  const [createBatch, { loading: creating }] = useMutation(CREATE_COURSE_BATCH, { refetchQueries });
  const [deleteBatch] = useMutation(DELETE_COURSE_BATCH, { refetchQueries });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const year = parseInt(startYear);
    if (isNaN(year) || year < 1900 || year > 2100) {
      toast.error("Enter a valid start year");
      return;
    }
    try {
      await createBatch({ variables: { courseId, startYear: year } });
      toast.success("Batch created");
      setStartYear(String(new Date().getFullYear()));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create batch");
    }
  }

  function confirmDelete(batch: CourseBatch) {
    setConfirmState({
      title: "Delete Batch",
      message: `Delete batch "${batch.name}"? Students assigned to this batch will not be removed.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteBatch({ variables: { id: batch.id } });
        toast.success("Batch deleted");
      },
    });
  }

  return (
    <>
      <Modal title={`Batches — ${courseName}`} isOpen={isOpen} onClose={onClose}>
        <div className="space-y-4">
          {/* Add batch form */}
          <form onSubmit={handleAdd} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Start Year
              </label>
              <input
                className="input-field"
                type="number"
                min="1900"
                max="2100"
                placeholder={String(new Date().getFullYear())}
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary flex items-center gap-2 shrink-0"
            >
              <Plus size={14} />
              {creating ? "Adding..." : "Add Batch"}
            </button>
          </form>

          <p className="text-xs text-muted-foreground/70">
            End year is auto-calculated from the course duration.
          </p>

          {/* Existing batches */}
          <div className="border border-border rounded-lg overflow-hidden">
            {loadingBatches ? (
              <div className="py-6 flex justify-center"><LoadingSpinner /></div>
            ) : batches.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 text-center py-6">
                No batches yet. Add one above.
              </p>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="table-th">Batch</th>
                    <th className="table-th">Start</th>
                    <th className="table-th">End</th>
                    <th className="table-th w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30">
                      <td className="table-td font-medium">{b.name}</td>
                      <td className="table-td">{b.startYear}</td>
                      <td className="table-td">{b.endYear}</td>
                      <td className="table-td">
                        <button
                          onClick={() => confirmDelete(b)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </>
  );
}
