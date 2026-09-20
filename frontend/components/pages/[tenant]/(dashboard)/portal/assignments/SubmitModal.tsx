"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { MyAssignment } from "./types";

export default function SubmitModal({
  entry,
  onClose,
  onSubmit,
}: {
  entry: MyAssignment | null;
  onClose: () => void;
  onSubmit: (entry: MyAssignment, text: string, attachmentUrl: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setText(entry.submission?.text ?? "");
    setAttachmentUrl(entry.submission?.attachmentUrl ?? "");
  }, [entry]);

  if (!entry) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(entry, text, attachmentUrl);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const resubmitting = !!entry.submission;

  return (
    <Modal title={entry.assignment.title} isOpen onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {entry.assignment.description && (
          <p className="whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            {entry.assignment.description}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Your answer</label>
          <textarea className="input-field" rows={6} value={text}
            onChange={(e) => setText(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Attachment URL (optional)
          </label>
          <input className="input-field" placeholder="https://…" value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)} />
        </div>

        {resubmitting && (
          <p className="text-xs text-yellow-600">
            Resubmitting replaces your previous answer and clears any grade already given.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Submitting…" : resubmitting ? "Resubmit" : "Submit"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
