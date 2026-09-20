"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import {
  LIST_LEARNING_GOALS,
} from "@/graphql/queries/learning";
import {
  CREATE_LEARNING_GOAL,
  UPDATE_LEARNING_GOAL,
  DELETE_LEARNING_GOAL,
} from "@/graphql/mutations/learning";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import {
  LearningGoal,
  GoalForm,
} from "@/types/pages/learning/page";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { Plus, Pencil, Trash2, Settings2, Users } from "lucide-react";
import Can from "@/components/access/Can";

const blankForm: GoalForm = {
  title: "",
  description: "",
  dueDate: "",
  isMandatory: false,
};

export default function LearningGoalLibraryPage() {
  const router = useRouter();
  const params = useParams();
  const tenant = (params?.tenant as string) ?? "";
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalForm>(blankForm);
  const [search, setSearch] = useState("");

  const { data, loading } = useQuery(LIST_LEARNING_GOALS);
  const goals: LearningGoal[] = data?.learningGoals ?? [];

  const [createGoal] = useMutation(CREATE_LEARNING_GOAL);
  const [updateGoal] = useMutation(UPDATE_LEARNING_GOAL);
  const [deleteGoal] = useMutation(DELETE_LEARNING_GOAL);

  const openCreate = () => {
    setEditingId(null);
    setForm(blankForm);
    setShowModal(true);
  };

  const openEdit = (g: LearningGoal) => {
    setEditingId(g.id);
    setForm({
      title: g.title,
      description: g.description ?? "",
      dueDate: g.dueDate ? g.dueDate.slice(0, 10) : "",
      isMandatory: g.isMandatory,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      title: form.title,
      description: form.description || null,
      dueDate: form.dueDate || null,
      isMandatory: form.isMandatory,
    };
    try {
      if (editingId) {
        await updateGoal({
          variables: { id: editingId, input },
          refetchQueries: [{ query: LIST_LEARNING_GOALS }],
        });
        toast.success("Goal updated");
      } else {
        await createGoal({
          variables: { input },
          refetchQueries: [{ query: LIST_LEARNING_GOALS }],
        });
        toast.success("Goal created");
      }
      setShowModal(false);
      setForm(blankForm);
      setEditingId(null);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save goal"));
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete learning goal "${title}"? All sections, units, assignments and progress records will be removed.`)) return;
    try {
      await deleteGoal({
        variables: { id },
        refetchQueries: [{ query: LIST_LEARNING_GOALS }],
      });
      toast.success("Goal deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete goal"));
    }
  };

  const countItems = (g: LearningGoal) => {
    const sections = g.sections ?? [];
    const items = sections.reduce((acc, s) => acc + (s.items?.length ?? 0), 0);
    return { sections: sections.length, items };
  };

  const filtered = search
    ? goals.filter((g) =>
        [g.title, g.description].some((v) =>
          String(v ?? "").toLowerCase().includes(search.toLowerCase()),
        ),
      )
    : goals;

  if (!isAdmin) {
    return (
      <div>
        <Header title="Learning Matrix" subtitle="Admin only" />
        <div className="card p-8 text-center text-muted-foreground">
          You do not have access to the learning goal library.
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Learning Goal Library"
        subtitle="Create and manage structured learning goals for your employees"
        action={
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => router.push(`/${tenant}/learning/assignments`)}
            >
              <Users size={16} /> Assignments
            </button>
            <Can module="learning" action="create">
              <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
                <Plus size={16} /> New Goal
              </button>
            </Can>
          </div>
        }
      />

      <div className="mb-4">
        <input
          className="input-field w-full"
          placeholder="Search goals…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Title</th>
                <th className="table-th">Mandatory</th>
                <th className="table-th">Due</th>
                <th className="table-th">Sections</th>
                <th className="table-th">Items</th>
                <th className="table-th">Created</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((g) => {
                const { sections, items } = countItems(g);
                return (
                  <tr key={g.id} className="hover:bg-muted/40">
                    <td className="table-td">
                      <div className="font-medium text-foreground">{g.title}</div>
                      {g.description && (
                        <div className="text-xs text-muted-foreground max-w-md truncate">
                          {g.description}
                        </div>
                      )}
                    </td>
                    <td className="table-td">
                      {g.isMandatory ? (
                        <Badge label="Mandatory" variant="red" />
                      ) : (
                        <Badge label="Optional" variant="gray" />
                      )}
                    </td>
                    <td className="table-td text-sm">
                      {g.dueDate ? new Date(g.dueDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="table-td text-sm">{sections}</td>
                    <td className="table-td text-sm">{items}</td>
                    <td className="table-td text-xs text-muted-foreground/70">
                      {g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
                          onClick={() => router.push(`/${tenant}/learning/${g.id}/builder`)}
                          title="Open course builder"
                        >
                          <Settings2 size={14} /> Builder
                        </button>
                        <Can module="learning" action="edit">
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => openEdit(g)}
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                        </Can>
                        <Can module="learning" action="delete">
                          <button
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(g.id, g.title)}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-td text-center text-muted-foreground/70 py-8">
                    No learning goals yet. Click "New Goal" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        title={editingId ? "Edit Learning Goal" : "Create Learning Goal"}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Title</label>
            <input
              className="input-field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Description</label>
            <textarea
              className="input-field"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Due date</label>
              <input
                type="date"
                className="input-field"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.isMandatory}
                  onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
                />
                Mandatory for all assigned employees
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editingId ? "Save" : "Create"}
            </button>
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

