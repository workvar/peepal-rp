"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { ACCOUNT_TYPES, type AccountType, type GqlAccount } from "../types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export type AccountForm = {
  code: string;
  name: string;
  type: AccountType;
  parentId: string;
  active: boolean;
};

const empty: AccountForm = { code: "", name: "", type: "asset", parentId: "", active: true };

export default function AccountModal({
  isOpen,
  onClose,
  editing,
  accounts,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: GqlAccount | null;
  accounts: GqlAccount[];
  onSave: (editing: GqlAccount | null, form: AccountForm) => Promise<void>;
}) {
  const [form, setForm] = useState<AccountForm>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            code: editing.code,
            name: editing.name,
            type: editing.type,
            parentId: editing.parentId ?? "",
            active: editing.active,
          }
        : empty,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<AccountForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(editing, form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const lockType = !!editing?.isSystem;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Edit Account" : "New Account"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-muted-foreground">Code</span>
            <input
              className="input w-full"
              value={form.code}
              onChange={(e) => set({ code: e.target.value })}
              required
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-muted-foreground">Type</span>
            <select
              className="input w-full"
              value={form.type}
              disabled={lockType}
              onChange={(e) => set({ type: e.target.value as AccountType })}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-sm block">
          <span className="block mb-1 text-muted-foreground">Name</span>
          <input
            className="input w-full"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            required
          />
        </label>

        <label className="text-sm block">
          <span className="block mb-1 text-muted-foreground">Parent (optional)</span>
          <SearchableSelect
            value={form.parentId}
            disabled={lockType}
            onChange={(v) => set({ parentId: v })}
            options={accounts
              .filter((a) => a.id !== editing?.id)
              .map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))}
            placeholder="— none (root) —"
          />
        </label>

        {editing && (
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              disabled={editing.isSystem}
              onChange={(e) => set({ active: e.target.checked })}
            />
            <span>Active</span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
