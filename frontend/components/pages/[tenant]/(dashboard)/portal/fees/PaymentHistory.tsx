"use client";

import toast from "react-hot-toast";
import { Download, Receipt } from "lucide-react";
import { formatCurrency } from "@/functions/fees/feeFormatters";
import { StatusBadge } from "@/components/pages/[tenant]/(dashboard)/fees/ui";
import { feeAPI } from "@/api/services/finance";
import { downloadBlobResponse } from "@/functions/downloadBlob";
import type { GqlFeePayment } from "@/components/pages/[tenant]/(dashboard)/fees/types";
import type { MyFeesState } from "./useMyFees";

// Payment history with a per-row receipt download and a bulk "all receipts" PDF.
// Both PDFs are generated on the backend and streamed as a download.
export default function PaymentHistory({ s }: { s: MyFeesState }) {
  const { payments, paidPayments, meta } = s;

  async function handleReceipt(p: GqlFeePayment) {
    try {
      const res = await feeAPI.downloadReceiptPDF(p.id);
      downloadBlobResponse(res.data, `receipt_${p.receiptNumber || p.id}.pdf`);
    } catch {
      toast.error("Could not generate receipt");
    }
  }

  async function handleAll() {
    if (paidPayments.length === 0) {
      toast.error("No paid receipts yet");
      return;
    }
    try {
      const res = await feeAPI.downloadAllReceiptsPDF();
      downloadBlobResponse(res.data, `fee_receipts_${meta.rollNumber || "me"}.pdf`);
      toast.success("Downloading all receipts");
    } catch {
      toast.error("Could not generate receipts");
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-green-600" />
          <h2 className="font-semibold text-foreground">Payment History</h2>
        </div>
        {paidPayments.length > 0 && (
          <button onClick={handleAll} className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium">
            <Download size={14} /> All receipts
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>
            <th className="table-th">Receipt</th>
            <th className="table-th">Fee</th>
            <th className="table-th text-right">Amount</th>
            <th className="table-th">Date</th>
            <th className="table-th">Mode</th>
            <th className="table-th">Status</th>
            <th className="table-th text-right">Receipt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payments.map((p) => (
            <tr key={p.id}>
              <td className="table-td font-mono text-xs">{p.receiptNumber}</td>
              <td className="table-td">{p.studentFee?.feeAllocation?.name ?? "—"}</td>
              <td className="table-td text-right font-medium">{formatCurrency(p.amount)}</td>
              <td className="table-td">{p.paymentDate}</td>
              <td className="table-td capitalize">{p.paymentMode}</td>
              <td className="table-td"><StatusBadge status={p.status} /></td>
              <td className="table-td text-right">
                {p.status === "paid" ? (
                  <button
                    onClick={() => handleReceipt(p)}
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Download size={14} /> PDF
                  </button>
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                No payments recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
