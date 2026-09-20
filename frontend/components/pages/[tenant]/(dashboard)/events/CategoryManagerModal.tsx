"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogDivider,
  DialogBody,
  DialogFooter,
  DialogField,
} from "@/components/ui/dialog";
import { Tag, Plus, Upload, Check, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  CREATE_EVENT_CATEGORY,
  UPDATE_EVENT_CATEGORY,
  DELETE_EVENT_CATEGORY,
} from "@/graphql/mutations/events";
import { presetColors, type EventCategory } from "./eventForm";

interface Props {
  open: boolean;
  categories: EventCategory[];
  onClose: () => void;
  onChanged: () => void;
  onOpenBulk: () => void;
}

interface Draft {
  name: string;
  color: string;
  description: string;
}

const emptyDraft = (): Draft => ({ name: "", color: presetColors[0], description: "" });

// Small swatch picker reused by the create and edit rows.
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {presetColors.map((c) => {
        const selected = value === c;
        return (
          <button
            key={c}
            type="button"
            aria-label={`Select color ${c}`}
            style={{ backgroundColor: c }}
            onClick={() => onChange(c)}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition ${
              selected ? "ring-2 ring-offset-1 ring-foreground scale-110" : "hover:scale-105"
            }`}
          >
            {selected && <Check size={11} className="text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}

export default function CategoryManagerModal({
  open,
  categories,
  onClose,
  onChanged,
  onOpenBulk,
}: Props) {
  const [createCategory] = useMutation(CREATE_EVENT_CATEGORY);
  const [updateCategory] = useMutation(UPDATE_EVENT_CATEGORY);
  const [deleteCategory] = useMutation(DELETE_EVENT_CATEGORY);

  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft());
  const [busy, setBusy] = useState(false);

  const patchDraft = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const patchEdit = (p: Partial<Draft>) => setEditDraft((d) => ({ ...d, ...p }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setBusy(true);
    try {
      await createCategory({ variables: { input: draft } });
      toast.success("Category added");
      setDraft(emptyDraft());
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not add category");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(c: EventCategory) {
    setEditingId(c.id);
    setEditDraft({ name: c.name, color: c.color || presetColors[0], description: c.description });
  }

  async function handleSaveEdit(id: string) {
    if (!editDraft.name.trim()) return;
    setBusy(true);
    try {
      await updateCategory({ variables: { id, input: editDraft } });
      toast.success("Category updated");
      setEditingId(null);
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not update category");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Events already tagged with it keep their value.")) return;
    setBusy(true);
    try {
      await deleteCategory({ variables: { id } });
      toast.success("Category deleted");
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not delete category");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="lg" accent="violet" onClose={onClose}>
        <DialogHeader icon={<Tag size={18} style={{ color: "#7c3aed" }} />}>
          <DialogTitle>Event Categories</DialogTitle>
          <DialogDescription>
            Categories your organisation creates appear alongside the built-in ones.
          </DialogDescription>
        </DialogHeader>
        <DialogDivider />

        <DialogBody className="space-y-5">
          {/* Add new */}
          <form onSubmit={handleCreate} className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DialogField label="Name" required>
                <input
                  type="text"
                  required
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                  placeholder="e.g. Workshop"
                  className="input-field"
                />
              </DialogField>
              <DialogField label="Color">
                <ColorPicker value={draft.color} onChange={(color) => patchDraft({ color })} />
              </DialogField>
            </div>
            <DialogField label="Description">
              <input
                type="text"
                value={draft.description}
                onChange={(e) => patchDraft({ description: e.target.value })}
                placeholder="Optional notes"
                className="input-field"
              />
            </DialogField>
            <div className="flex justify-end">
              <button type="submit" disabled={busy || !draft.name.trim()} className="btn-primary flex items-center gap-2">
                <Plus size={15} /> Add category
              </button>
            </div>
          </form>

          {/* Existing list */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Your categories ({categories.length})
            </p>
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                No custom categories yet. Add one above or import in bulk.
              </p>
            )}
            {categories.map((c) =>
              editingId === c.id ? (
                <div key={c.id} className="rounded-lg border border-primary/50 bg-muted/30 p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editDraft.name}
                      onChange={(e) => patchEdit({ name: e.target.value })}
                      className="input-field"
                    />
                    <ColorPicker value={editDraft.color} onChange={(color) => patchEdit({ color })} />
                  </div>
                  <input
                    type="text"
                    value={editDraft.description}
                    onChange={(e) => patchEdit({ description: e.target.value })}
                    placeholder="Optional notes"
                    className="input-field"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="btn-ghost flex items-center gap-1.5">
                      <X size={14} /> Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(c.id)}
                      disabled={busy || !editDraft.name.trim()}
                      className="btn-primary flex items-center gap-1.5"
                    >
                      <Check size={14} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                  <span
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: c.color || "#999" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => startEdit(c)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                    aria-label="Edit category"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                    aria-label="Delete category"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ),
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <button className="btn-secondary flex items-center gap-2" onClick={onOpenBulk}>
            <Upload size={15} /> Bulk upload
          </button>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
