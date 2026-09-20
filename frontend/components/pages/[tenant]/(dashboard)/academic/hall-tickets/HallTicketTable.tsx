"use client";

import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import CodeImage from "@/components/shared/CodeImage";
import { Download, QrCode, Ban, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { GqlHallTicket } from "./types";
import { statusVariant } from "./types";

export default function HallTicketTable({
  tickets,
  onDownload,
  onRevoke,
  onRelease,
}: {
  tickets: GqlHallTicket[];
  onDownload: (t: GqlHallTicket) => void;
  onRevoke: (t: GqlHallTicket) => void;
  onRelease: (t: GqlHallTicket) => void;
}) {
  // Which row's QR is expanded. Only one at a time keeps the table readable.
  const [qrFor, setQrFor] = useState<string | null>(null);

  if (tickets.length === 0) {
    return (
      <div className="card py-12 text-center text-muted-foreground/70">
        No hall tickets issued for this exam yet.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Ticket</th>
            <th className="table-th">Student</th>
            <th className="table-th">Seat</th>
            <th className="table-th">Centre</th>
            <th className="table-th">Status</th>
            <th className="table-th">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {tickets.map((t) => (
            <tr key={t.id} className="hover:bg-muted/40 align-top">
              <td className="table-td font-mono text-sm">{t.ticketNumber}</td>
              <td className="table-td">
                <span className="block font-medium">{t.student?.user?.name ?? "—"}</span>
                <span className="block text-xs text-muted-foreground/70">
                  {t.student?.rollNumber}
                  {t.student?.course ? ` · ${t.student.course.code}` : ""}
                </span>
                {qrFor === t.id && (
                  <span className="mt-2 block">
                    <CodeImage
                      content={t.qrPayload}
                      size={120}
                      alt={`Verification QR for ${t.ticketNumber}`}
                    />
                  </span>
                )}
              </td>
              <td className="table-td font-mono text-sm">{t.seatNumber || "—"}</td>
              <td className="table-td text-sm">{t.examCenter || "—"}</td>
              <td className="table-td">
                <Badge
                  label={t.status}
                  variant={statusVariant[t.status] ?? "gray"}
                  className="capitalize"
                />
                {t.holdReason && (
                  <span className="mt-1 block max-w-[16rem] text-xs text-amber-600">
                    {t.holdReason}
                  </span>
                )}
              </td>
              <td className="table-td">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQrFor((cur) => (cur === t.id ? null : t.id))}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    aria-label={`Show QR for ${t.ticketNumber}`}
                  >
                    <QrCode size={15} />
                  </button>
                  <button
                    onClick={() => onDownload(t)}
                    className="p-1 text-blue-600 hover:text-blue-700"
                    aria-label={`Download ${t.ticketNumber}`}
                  >
                    <Download size={15} />
                  </button>
                  {t.status === "held" && (
                    <Can module="hall-tickets" action="edit">
                      <button
                        onClick={() => onRelease(t)}
                        className="flex items-center gap-1 text-sm text-emerald-600 hover:underline"
                      >
                        <CheckCircle2 size={14} /> Release
                      </button>
                    </Can>
                  )}
                  {t.status !== "revoked" && (
                    <Can module="hall-tickets" action="delete">
                      <button
                        onClick={() => onRevoke(t)}
                        className="flex items-center gap-1 text-sm text-red-500 hover:underline"
                      >
                        <Ban size={14} /> Revoke
                      </button>
                    </Can>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
