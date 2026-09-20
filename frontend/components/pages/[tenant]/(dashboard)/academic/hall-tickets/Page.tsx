"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { downloadBlobResponse } from "@/functions/downloadBlob";
import { examCellAPI } from "@/api/services/examCell";
import { TicketCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useHallTickets } from "./useHallTickets";
import IssueModal from "./IssueModal";
import HallTicketTable from "./HallTicketTable";
import type { GqlHallTicket, IssueForm } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function HallTicketsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canWrite =
    user?.role === "admin" || user?.role === "super_admin" || user?.role === "staff";

  const {
    courses,
    schedules,
    tickets,
    selectedSchedule,
    loading,
    scope,
    setScope,
    issueMut,
    revokeMut,
    releaseMut,
  } = useHallTickets();

  const [showIssue, setShowIssue] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const handleIssue = async (form: IssueForm) => {
    const input = {
      examScheduleId: scope.examScheduleId,
      courseId: form.course_id || null,
      semesterNumber: form.semester_number ? parseInt(form.semester_number, 10) : null,
      examCenter: form.exam_center.trim() || null,
      seatPrefix: form.seat_prefix.trim() || null,
      checkFeeDues: form.check_fee_dues,
      minAttendancePercent: form.min_attendance ? parseFloat(form.min_attendance) : null,
    };

    try {
      const res = await issueMut({ variables: { input } });
      const result = res.data?.issueHallTickets;
      const parts = [`${result?.issued ?? 0} issued`];
      if (result?.held) parts.push(`${result.held} held`);
      if (result?.skipped) parts.push(`${result.skipped} already had one`);
      toast.success(parts.join(", "));
      setShowIssue(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to issue hall tickets");
    }
  };

  const handleDownload = async (ticket: GqlHallTicket) => {
    try {
      const res = await examCellAPI.downloadHallTicketPDF(ticket.id);
      downloadBlobResponse(res.data, `hall-ticket-${ticket.ticketNumber}.pdf`);
    } catch {
      toast.error("Failed to download the hall ticket");
    }
  };

  const handleRevoke = (ticket: GqlHallTicket) => {
    setConfirmState({
      title: "Revoke Hall Ticket",
      message: `${ticket.ticketNumber} will no longer be valid for entry, and the student will not be able to download it.`,
      variant: "danger",
      confirmLabel: "Revoke",
      onConfirm: async () => {
        await revokeMut({ variables: { id: ticket.id } });
        toast.success("Revoked");
      },
    });
  };

  const handleRelease = (ticket: GqlHallTicket) => {
    setConfirmState({
      title: "Release Hold",
      message: `${ticket.ticketNumber} will become valid for entry and downloadable by the student.`,
      confirmLabel: "Release",
      onConfirm: async () => {
        await releaseMut({ variables: { id: ticket.id } });
        toast.success("Hold released");
      },
    });
  };

  return (
    <div>
      <Header
        title="Hall Tickets"
        subtitle="Issue admit cards with a verification QR, and manage eligibility holds"
        action={
          canWrite && scope.examScheduleId ? (
            <Can module="hall-tickets" action="create">
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => setShowIssue(true)}
              >
                <TicketCheck size={16} /> Issue Tickets
              </button>
            </Can>
          ) : undefined
        }
      />

      <div className="card mb-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Exam Schedule</span>
          <SearchableSelect
            value={scope.examScheduleId}
            onChange={(v) => setScope.setExamScheduleId(v)}
            options={schedules.map((s) => ({
              value: s.id,
              label: `${s.name}${s.semesterNumber ? ` — Sem ${s.semesterNumber}` : ""}`,
            }))}
            placeholder="Select an exam…"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Status</span>
          <select
            className="input-field w-full"
            value={scope.status}
            onChange={(e) => setScope.setStatus(e.target.value)}
            disabled={!scope.examScheduleId}
          >
            <option value="">All</option>
            <option value="issued">Issued</option>
            <option value="held">Held</option>
            <option value="revoked">Revoked</option>
          </select>
        </label>
      </div>

      {!scope.examScheduleId ? (
        <div className="card py-12 text-center text-muted-foreground/70">
          Pick an exam schedule to see or issue its hall tickets.
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <HallTicketTable
          tickets={tickets}
          onDownload={handleDownload}
          onRevoke={handleRevoke}
          onRelease={handleRelease}
        />
      )}

      <IssueModal
        isOpen={showIssue}
        onClose={() => setShowIssue(false)}
        courses={courses}
        schedule={selectedSchedule}
        onIssue={handleIssue}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
