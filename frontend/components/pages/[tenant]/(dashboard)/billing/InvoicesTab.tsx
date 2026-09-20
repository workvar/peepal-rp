"use client";

// Invoices tab: filterable table + record-payment modal.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { clinicalAPI } from "@/api/services/clinical";
import { downloadBlobResponse } from "@/functions/downloadBlob";
import type { GqlInvoice } from "./types";
import { PAYMENT_MODES } from "./types";

const STATUS_VARIANT: Record<string, "yellow" | "blue" | "green" | "gray"> = {
  unpaid: "yellow",
  partially_paid: "blue",
  paid: "green",
  cancelled: "gray",
};

export type PaymentForm = { amount: string; mode: string; reference: string };

export default function InvoicesTab({
  invoices,
  onCancel,
  onRecordPayment,
}: {
  invoices: GqlInvoice[];
  onCancel: (inv: GqlInvoice) => void;
  onRecordPayment: (inv: GqlInvoice, form: PaymentForm) => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [paying, setPaying] = useState<GqlInvoice | null>(null);
  const [payForm, setPayForm] = useState<PaymentForm>({ amount: "", mode: "cash", reference: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (paying) {
      setPayForm({
        amount: String((paying.total - paying.amountPaid).toFixed(2)),
        mode: "cash",
        reference: "",
      });
    }
  }, [paying]);

  const q = search.toLowerCase();
  const filtered = invoices.filter(
    (inv) =>
      (!statusFilter || inv.status === statusFilter) &&
      (!q ||
        [inv.invoiceNo, inv.patientName, inv.patientMrn].some((v) =>
          v.toLowerCase().includes(q),
        )),
  );

  const downloadPdf = async (inv: GqlInvoice) => {
    try {
      const res = await clinicalAPI.downloadInvoicePDF(inv.id);
      downloadBlobResponse(res.data, `${inv.invoiceNo}.pdf`);
    } catch {
      toast.error("Could not generate the invoice PDF");
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paying) return;
    setSaving(true);
    try {
      await onRecordPayment(paying, payForm);
      setPaying(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        <input className="input-field flex-1 min-w-48" placeholder="Search invoice no, patient, MRN…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input-field w-auto" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_VARIANT).map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">
          No invoices found. Create one to bill a patient for services.
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Invoice</th>
                <th className="table-th">Date</th>
                <th className="table-th">Patient</th>
                <th className="table-th">Total</th>
                <th className="table-th">Paid</th>
                <th className="table-th">Balance</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((inv) => {
                const balance = inv.total - inv.amountPaid;
                const payable = inv.status === "unpaid" || inv.status === "partially_paid";
                return (
                  <tr key={inv.id} className="hover:bg-muted/40">
                    <td className="table-td font-mono">{inv.invoiceNo}</td>
                    <td className="table-td font-mono">{inv.date}</td>
                    <td className="table-td font-medium">
                      {inv.patientName}
                      <span className="text-xs text-muted-foreground/70 ml-1">({inv.patientMrn})</span>
                      {(inv.patientUhid || inv.encounterCrNumber) && (
                        <div className="text-xs text-muted-foreground/70 font-mono">
                          {inv.patientUhid && <span>UHID: {inv.patientUhid}</span>}
                          {inv.patientUhid && inv.encounterCrNumber && "  ·  "}
                          {inv.encounterCrNumber && <span>CR: {inv.encounterCrNumber}</span>}
                        </div>
                      )}
                    </td>
                    <td className="table-td font-mono">{inv.total.toFixed(2)}</td>
                    <td className="table-td font-mono">{inv.amountPaid.toFixed(2)}</td>
                    <td className="table-td font-mono">{balance.toFixed(2)}</td>
                    <td className="table-td">
                      <Badge label={inv.status.replace("_", " ")} variant={STATUS_VARIANT[inv.status] ?? "gray"} />
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        {inv.status !== "cancelled" && (
                          <button
                            className="text-muted-foreground hover:text-foreground p-1"
                            title="Download PDF"
                            aria-label={`Download ${inv.invoiceNo} as PDF`}
                            onClick={() => downloadPdf(inv)}
                          >
                            <Download size={15} />
                          </button>
                        )}
                        {payable && (
                          <Can module="billing" action="create">
                            <button className="text-sm text-emerald-600 hover:underline"
                              onClick={() => setPaying(inv)}>
                              Record Payment
                            </button>
                          </Can>
                        )}
                        {inv.status === "unpaid" && (
                          <Can module="billing" action="edit">
                            <button className="text-sm text-red-500 hover:underline"
                              onClick={() => onCancel(inv)}>
                              Cancel
                            </button>
                          </Can>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        title={paying ? `Payment — ${paying.invoiceNo}` : "Payment"}
        isOpen={!!paying}
        onClose={() => setPaying(null)}
      >
        {paying && (
          <form onSubmit={submitPayment} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {paying.patientName} · Total {paying.total.toFixed(2)} · Outstanding{" "}
              <span className="font-mono">{(paying.total - paying.amountPaid).toFixed(2)}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Amount</label>
                <input type="number" min="0.01" step="0.01" className="input-field"
                  value={payForm.amount} required
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Mode</label>
                <select className="input-field" value={payForm.mode}
                  onChange={(e) => setPayForm((f) => ({ ...f, mode: e.target.value }))}>
                  {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Reference <span className="text-muted-foreground/60">(txn id / cheque no)</span>
              </label>
              <input className="input-field" value={payForm.reference}
                onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? "Saving…" : "Record"}
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setPaying(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
