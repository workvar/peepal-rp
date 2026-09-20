"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlPurchaseInvoice } from "./types";

export default function PaymentModal({
  isOpen,
  onClose,
  invoice,
  onPay,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: GqlPurchaseInvoice | null;
  onPay: (amount: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState("0");
  const [saving, setSaving] = useState(false);

  const balance = invoice ? invoice.total - invoice.paidAmount : 0;

  useEffect(() => {
    if (isOpen && invoice) setAmount(String(Math.max(balance, 0)));
  }, [isOpen, invoice, balance]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount) || 0;
    if (n <= 0) return;
    setSaving(true);
    try {
      await onPay(n);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={invoice ? `Pay ${invoice.invoiceNumber}` : "Record Payment"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted-foreground/80">
          Balance outstanding: <span className="font-medium">{balance.toFixed(2)}</span>
        </p>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Payment Amount</label>
          <input type="number" min="0" step="any" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : "Record payment"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
