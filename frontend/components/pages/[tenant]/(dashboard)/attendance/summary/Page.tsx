"use client";

import { useQuery } from "@apollo/client";
import { ATTENDANCE_SUMMARY } from "@/graphql/queries/attendance";
import { LIST_STUDENTS } from "@/graphql/queries/students";
import Header from "@/components/layout/Header";
import QueryError from "@/components/ui/QueryError";
import { TableSkeleton } from "@/components/ui/skeletons";
import { useTerminology } from "@/store/hooks/useTerminology";
import type { GqlAttendanceSummaryRow } from "@/types/pages/attendance/page";
import type { GqlStudent } from "@/types/pages/students/page";

export default function AttendanceSummaryPage() {
  const t = useTerminology();
  const { data: summaryData, loading: summaryLoading, error, refetch } = useQuery(ATTENDANCE_SUMMARY, {
    variables: { entityType: "student" },
  });
  const { data: studentsData, loading: studentsLoading } = useQuery(LIST_STUDENTS);

  const summary: GqlAttendanceSummaryRow[] = summaryData?.attendanceSummary ?? [];
  const students: GqlStudent[] = studentsData?.students ?? [];
  const studentMap: Record<string, GqlStudent> = Object.fromEntries(students.map((s) => [s.id, s]));
  const loading = summaryLoading || studentsLoading;

  const getPctClass = (pct: number) => {
    if (pct >= 75) return "text-green-600 font-semibold";
    if (pct >= 60) return "text-yellow-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  return (
    <div>
      <Header title={`${t.attendance} Summary`} subtitle={`Per-${t.member.toLowerCase()} ${t.attendance.toLowerCase()} statistics`} />
      {error && <QueryError message={error.message} onRetry={() => void refetch()} />}
      {loading && summary.length === 0 ? (
        <TableSkeleton
          columns={[t.member, "Roll No.", t.course, "Total", "Present", "Absent", "Late", "Attendance %"]}
          rows={6}
          colWidths={["w-32", "w-20", "w-28", "w-12", "w-12", "w-12", "w-12", "w-16"]}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">{t.member}</th>
                <th className="table-th">Roll No.</th>
                <th className="table-th">{t.course}</th>
                <th className="table-th text-center">Total</th>
                <th className="table-th text-center">Present</th>
                <th className="table-th text-center">Absent</th>
                <th className="table-th text-center">Late</th>
                <th className="table-th text-center">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {summary.map((row) => {
                const student = studentMap[row.entityId];
                const pct = Math.round(row.attendancePct);
                return (
                  <tr key={row.entityId} className="hover:bg-muted/40">
                    <td className="table-td font-medium">{student?.user?.name ?? row.entityId.slice(0, 8)}</td>
                    <td className="table-td font-mono text-sm">{student?.rollNumber ?? "—"}</td>
                    <td className="table-td text-muted-foreground">{student?.course?.name ?? "—"}</td>
                    <td className="table-td text-center">{row.total}</td>
                    <td className="table-td text-center text-green-600">{row.present}</td>
                    <td className="table-td text-center text-red-500">{row.absent}</td>
                    <td className="table-td text-center text-yellow-600">{row.late}</td>
                    <td className={`table-td text-center ${getPctClass(pct)}`}>{pct}%</td>
                  </tr>
                );
              })}
              {summary.length === 0 && (
                <tr><td colSpan={8} className="table-td text-center text-muted-foreground/70 py-8">No attendance data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
