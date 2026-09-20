"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlPurchaseOrder, GqlInventoryItemRef } from "./types";

type LineState = {
  lineId: string;
  itemName: string;
  outstanding: number;
  isDrug: boolean;
  received: string;
  batchNo: string;
  expiryDate: string;
};

export type ReceivePayload = {
  lines: { lineId: string; receivedQty: number; batchNo?: string; expiryDate?: string }[];
};

export default function ReceiveModal({
  isOpen,
  onClose,
  po,
  items,
  onReceive,
}: {
  isOpen: boolean;
  onClose: () => void;
  po: GqlPurchaseOrder | null;
  items: GqlInventoryItemRef[];
  onReceive: (payload: ReceivePayload) => Promise<void>;
}) {
  const [lines, setLines] = useState<LineState[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !po) return;
    setLines(
      po.items
        .map((it) => {
          const outstanding = it.qty - it.receivedQty;
          const linked = it.itemId ? items.find((x) => x.id === it.itemId) : undefined;
          return {
            lineId: it.id,
            itemName: it.itemName,
            outstanding,
            isDrug: !!linked?.linkedDrugId,
            received: outstanding > 0 ? String(outstanding) : "0",
            batchNo: "",
            expiryDate: "",
          };
        })
        .filter((l) => l.outstanding > 0),
    );
  }, [isOpen, po, items]);

  const set = (i: number, patch: Partial<LineState>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ReceivePayload = { lines: [] };
    for (const l of lines) {
      const qty = parseFloat(l.received) || 0;
      if (qty <= 0) continue;
      payload.lines.push({
        lineId: l.lineId,
        receivedQty: qty,
        batchNo: l.batchNo || undefined,
        expiryDate: l.expiryDate || undefined,
      });
    }
    if (payload.lines.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onReceive(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={po ? `Receive ${po.poNumber}` : "Receive"} isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 py-6 text-center">Nothing left to receive on this order.</p>
        ) : (
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={l.lineId} className="border border-border/60 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{l.itemName}</span>
                  <span className="text-xs text-muted-foreground/70">Outstanding: {l.outstanding}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-foreground/70 mb-1">Receive qty</label>
                    <input type="number" min="0" max={l.outstanding} step="any" className="input-field" value={l.received} onChange={(e) => set(i, { received: e.target.value })} />
                  </div>
                  {l.isDrug && (
                    <>
                      <div>
                        <label className="block text-xs text-foreground/70 mb-1">Batch no *</label>
                        <input className="input-field" value={l.batchNo} onChange={(e) => set(i, { batchNo: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-xs text-foreground/70 mb-1">Expiry</label>
                        <input type="date" className="input-field" value={l.expiryDate} onChange={(e) => set(i, { expiryDate: e.target.value })} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving || lines.length === 0}>
            {saving ? "Receiving…" : "Receive stock"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
