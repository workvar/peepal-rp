"use client";

// Student self-service hall tickets. Reads myHallTickets (scoped server-side to
// the signed-in student) and downloads via /exam-cell/hall-tickets/me/pdf,
// which likewise resolves the ticket from the session — no id is ever passed.

import { useQuery } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CodeImage from "@/components/shared/CodeImage";
import { MY_HALL_TICKETS } from "@/graphql/queries/exam-cell";
import { downloadBlobResponse } from "@/functions/downloadBlob";
import { examCellAPI } from "@/api/services/examCell";
import { Download } from "lucide-react";
import toast from "react-hot-toast";

type MyTicket = {
  id: string;
  examScheduleId: string;
  ticketNumber: string;
  seatNumber?: string | null;
  examCenter?: string | null;
  issuedOn?: string | null;
  qrPayload: string;
  examSchedule?: {
    id: string;
    name: string;
    examType: string;
    startDate?: string | null;
    endDate?: string | null;
    instructions?: string | null;
  } | null;
};

export default function MyHallTicketsPage() {
  const { data, loading } = useQuery(MY_HALL_TICKETS);
  const tickets: MyTicket[] = data?.myHallTickets ?? [];

  const download = async (t: MyTicket) => {
    try {
      const res = await examCellAPI.downloadMyHallTicketPDF(t.examScheduleId);
      downloadBlobResponse(res.data, `hall-ticket-${t.ticketNumber}.pdf`);
    } catch {
      toast.error("Could not download your hall ticket. Please contact the exam office.");
    }
  };

  return (
    <div>
      <Header
        title="My Hall Tickets"
        subtitle="Download your admit card and carry it to every exam session"
      />

      {loading ? (
        <LoadingSpinner />
      ) : tickets.length === 0 ? (
        <div className="card py-12 text-center text-muted-foreground/70">
          You have no hall tickets yet. They appear here once the exam office issues them.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="card flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-foreground">
                  {t.examSchedule?.name ?? "Examination"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ticket <span className="font-mono">{t.ticketNumber}</span>
                  {t.seatNumber ? ` · Seat ${t.seatNumber}` : ""}
                </p>
                {t.examCenter && (
                  <p className="text-sm text-muted-foreground">Centre: {t.examCenter}</p>
                )}
                {t.examSchedule?.startDate && (
                  <p className="text-sm text-muted-foreground">
                    {t.examSchedule.startDate}
                    {t.examSchedule.endDate && t.examSchedule.endDate !== t.examSchedule.startDate
                      ? ` to ${t.examSchedule.endDate}`
                      : ""}
                  </p>
                )}
                <button
                  onClick={() => download(t)}
                  className="btn-primary mt-3 flex items-center gap-2"
                >
                  <Download size={16} /> Download PDF
                </button>
              </div>

              <CodeImage
                content={t.qrPayload}
                size={104}
                alt={`Verification QR for ${t.ticketNumber}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
