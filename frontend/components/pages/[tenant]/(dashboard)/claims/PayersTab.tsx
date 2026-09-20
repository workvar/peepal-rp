"use client";

// Insurance payers / TPAs catalog.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import { useBulkSelect, runBulkDelete, BulkDeleteBar, RowCheckbox, HeaderCheckbox } from "@/components/ui/bulkSelect";
import { useLazyList } from "@/components/ui/useLazyList";
import { Plus, Trash2 } from "lucide-react";
import type { GqlPayer, PayerForm } from "./types";
import { emptyPayerForm, PAYER_TYPES } from "./types";

export default function PayersTab({
  payers, onSave, onDelete, deleteOne, onBulkFinished,
}: {
  payers: GqlPayer[];
  onSave: (editing: GqlPayer | null, form: PayerForm) => Promise<void>;
  onDelete: (p: GqlPayer) => void;
  deleteOne: (id: string) => Promise<unknown>;
  onBulkFinished: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlPayer | null>(null);
  const [form, setForm] = useState<PayerForm>(emptyPayerForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sel = useBulkSelect();
  const ids = payers.map((p) => p.id);
  const { visible, sentinelRef, hasMore, shown, total } = useLazyList(payers);

  useEffect(() => {
    if (!showModal) return;
    setForm(editing
      ? {
          code: editing.code, name: editing.name, payer_type: editing.payerType,
          contact_name: editing.contactName ?? "", phone: editing.phone ?? "",
          email: editing.email ?? "", active: editing.active,
        }
      : emptyPayerForm);
  }, [showModal, editing]);

  const set = (patch: Partial<PayerForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(editing, form);
      setShowModal(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    setDeleting(true);
    await runBulkDelete([...sel.selected], deleteOne, "payer");
    sel.clear();
    setDeleting(false);
  };

  return (
    <div>
      <div className="mb-3 flex justify-end gap-2">
        <Can module="claims" action="create">
          <BulkUploadButton resource="insurance_payers" label="Bulk Payers"
            onFinished={(s) => { if (s.successful > 0) onBulkFinished(); }} />
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={16} /> Add Payer
          </button>
        </Can>
      </div>

      <BulkDeleteBar sel={sel} onDelete={deleteSelected} deleting={deleting} />

      {payers.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No payers yet.</div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th w-10">
                  <Can module="claims" action="delete">
                    <HeaderCheckbox checked={sel.isAllSelected(ids)} onChange={() => sel.toggleAll(ids)} />
                  </Can>
                </th>
                <th className="table-th">Code</th>
                <th className="table-th">Name</th>
                <th className="table-th">Type</th>
                <th className="table-th">Contact</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {visible.map((p) => (
                <tr key={p.id} className={`hover:bg-muted/40 ${sel.selected.has(p.id) ? "bg-primary/5" : ""}`}>
                  <td className="table-td w-10">
                    <Can module="claims" action="delete">
                      <RowCheckbox checked={sel.selected.has(p.id)} onChange={() => sel.toggle(p.id)} />
                    </Can>
                  </td>
                  <td className="table-td font-mono text-xs">{p.code}</td>
                  <td className="table-td font-medium">{p.name}</td>
                  <td className="table-td capitalize">{p.payerType}</td>
                  <td className="table-td text-xs text-muted-foreground">
                    {p.contactName || "—"}{p.phone ? ` · ${p.phone}` : ""}
                  </td>
                  <td className="table-td">
                    <Badge label={p.active ? "Active" : "Inactive"} variant={p.active ? "green" : "gray"} />
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <Can module="claims" action="edit">
                        <button className="text-sm text-blue-600 hover:underline"
                          onClick={() => { setEditing(p); setShowModal(true); }}>Edit</button>
                      </Can>
                      <Can module="claims" action="delete">
                        <button className="text-red-500 hover:text-red-700 p-1"
                          aria-label={`Delete ${p.name}`} onClick={() => onDelete(p)}>
                          <Trash2 size={15} />
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
              {hasMore && (
                <tr ref={sentinelRef}>
                  <td colSpan={7} className="table-td text-center text-sm text-muted-foreground/70 py-4">Loading more…</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-muted-foreground/60 border-t border-border/60">
            Showing {shown} of {total}
          </div>
        </div>
      )}

      <Modal title={editing ? "Edit Payer" : "Add Payer"} isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Code</label>
              <input className="input-field" value={form.code} required onChange={(e) => set({ code: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
              <input className="input-field" value={form.name} required onChange={(e) => set({ name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Type</label>
              <select className="input-field" value={form.payer_type} onChange={(e) => set({ payer_type: e.target.value })}>
                {PAYER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Contact Name</label>
              <input className="input-field" value={form.contact_name} onChange={(e) => set({ contact_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Phone</label>
              <input className="input-field" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
              <input className="input-field" value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Save"}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={() => { setShowModal(false); setEditing(null); }}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
