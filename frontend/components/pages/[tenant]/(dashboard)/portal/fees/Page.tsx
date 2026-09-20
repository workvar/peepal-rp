"use client";

// Student self-service "My Fees" page: headline totals, upcoming dues, the
// full installment schedule, and payment history with downloadable PDF
// receipts. The whole schedule can also be exported as a PDF.

import toast from "react-hot-toast";
import { Download, Wallet } from "lucide-react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { feeAPI } from "@/api/services/finance";
import { downloadBlobResponse } from "@/functions/downloadBlob";
import { useMyFees } from "./useMyFees";
import FeeSummaryCards from "./FeeSummaryCards";
import UpcomingSchedule from "./UpcomingSchedule";
import FullSchedule from "./FullSchedule";
import PaymentHistory from "./PaymentHistory";

export default function MyFeesPage() {
  const s = useMyFees();

  async function handleSchedule() {
    if (!s.hasFees) {
      toast.error("No fees to download");
      return;
    }
    try {
      const res = await feeAPI.downloadSchedulePDF();
      downloadBlobResponse(res.data, `fee_schedule_${s.meta.rollNumber || "me"}.pdf`);
      toast.success("Downloading schedule");
    } catch {
      toast.error("Could not generate schedule");
    }
  }

  if (s.loading) return <div className="p-6"><LoadingSpinner /></div>;
  if (s.error)
    return <div className="p-6 text-red-500">Could not load your fees. Please contact your administrator.</div>;

  return (
    <div className="space-y-6">
      <Header
        title="My Fees"
        subtitle="Your fee schedule, dues, and payment receipts"
        action={
          <button
            onClick={handleSchedule}
            disabled={!s.hasFees}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={16} /> Download schedule
          </button>
        }
      />

      {!s.hasFees ? (
        <div className="card text-center py-12">
          <Wallet size={28} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-foreground font-medium">No fees assigned yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            When your institute allocates fees to you, they will appear here.
          </p>
        </div>
      ) : (
        <>
          <FeeSummaryCards s={s} />
          <UpcomingSchedule s={s} />
          <FullSchedule s={s} />
          <PaymentHistory s={s} />
        </>
      )}
    </div>
  );
}
