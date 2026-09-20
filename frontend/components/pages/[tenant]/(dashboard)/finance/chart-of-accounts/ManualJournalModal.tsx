"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { Plus, Trash2 } from "lucide-react";
import { money, todayISO, type GqlAccount } from "../types";
import SearchableSelect from "@/components/ui/SearchableSelect";

type Line = { accountId: string; debit: string; credit: string; memo: string };

const blankLine = (): Line => ({ accountId: "", debit: "", credit: "", memo: "" });

export default function ManualJournalModal({
  isOpen,
  onClose,
  accounts,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: GqlAccount[];
  onSave: (input: {
    date: string;
    memo: string | null;
    lines: { accountId: string; debit: number; credit: number; memo: string | null }[];
  }) => Promise<void>;
}) {
  const [date, setDate] = useState(todayISO());
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine(), blankLine()]);
  const [saving, setSaving] = useState(false);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanced) return;
    setSaving(true);
    try {
      await onSave({
        date,
        memo: memo.trim() || null,
        lines: lines
          .filter((l) => l.accountId && (parseFloat(l.debit) || parseFloat(l.credit)))
          .map((l) => ({
            accountId: l.accountId,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            memo: l.memo.trim() || null,
          })),
      });
      setLines([blankLine(), blankLine()]);
      setMemo("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Journal Entry" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-muted-foreground">Date</span>
            <input
              type="date"
              className="input w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-muted-foreground">Memo</span>
            <input className="input w-full" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </label>
        </div>

        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <SearchableSelect
                  value={l.accountId}
                  onChange={(v) => setLine(i, { accountId: v })}
                  options={accounts.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))}
                  placeholder="Select account…"
                />
              </div>
              <input
                className="input col-span-3"
                placeholder="Debit"
                inputMode="decimal"
                value={l.debit}
                onChange={(e) => setLine(i, { debit: e.target.value, credit: "" })}
              />
              <input
                className="input col-span-3"
                placeholder="Credit"
                inputMode="decimal"
                value={l.credit}
                onChange={(e) => setLine(i, { credit: e.target.value, debit: "" })}
              />
              <button
                type="button"
                className="col-span-1 text-muted-foreground hover:text-red-500"
                onClick={() => setLines((ls) => (ls.length > 2 ? ls.filter((_, idx) => idx !== i) : ls))}
                aria-label="Remove line"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary flex items-center gap-1"
            onClick={() => setLines((ls) => [...ls, blankLine()])}
          >
            <Plus size={14} /> Add line
          </button>
        </div>

        <div className="flex justify-between text-sm border-t pt-2">
          <span>
            Debit {money(totalDebit)} · Credit {money(totalCredit)}
          </span>
          <span className={balanced ? "text-green-600" : "text-red-500"}>
            {balanced ? "Balanced" : "Must balance"}
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!balanced || saving}>
            {saving ? "Posting…" : "Post Entry"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
