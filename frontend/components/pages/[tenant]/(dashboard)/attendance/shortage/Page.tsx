"use client";

import { useQuery } from "@apollo/client";
import { ATTENDANCE_SHORTAGE } from "@/graphql/queries/attendance";
import Header from "@/components/layout/Header";
import QueryError from "@/components/ui/QueryError";
import { TableSkeleton } from "@/components/ui/skeletons";
import { useTerminology } from "@/store/hooks/useTerminology";
import type { GqlShortageItem } from "@/types/pages/attendance/page";
import { AlertTriangle } from "lucide-react";
import ThresholdConfig from "./ThresholdConfig";
import { useAppSelector } from "@/store/hooks";

export default function ShortageListPage() {
  const t = useTerminology();
  const role = useAppSelector((s) => s.auth.user?.role);
  const { data, loading, error, refetch } = useQuery(ATTENDANCE_SHORTAGE);
  const shortage: GqlShortageItem[] = data?.attendanceShortage?.students ?? [];
  const threshold: number = data?.attendanceShortage?.threshold ?? 75;
  const memberLower = t.member.toLowerCase();
  const isAdmin = role === "admin";

  return (
    <div>
      <Header
        title={`${t.attendance} Shortage`}
        subtitle={`${t.member_plural} below ${threshold}% attendance threshold`}
        action={isAdmin ? <ThresholdConfig currentThreshold={threshold} /> : undefined}
      />
      {error && <QueryError message={error.message} onRetry={() => void refetch()} />}
      {loading ? (
        <TableSkeleton
          columns={[t.member, "Roll No.", t.course, "Present/Total", "Attendance %", "Shortfall"]}
          rows={5}
          colWidths={["w-32", "w-20", "w-28", "w-20", "w-16", "w-16"]}
        />
      ) : shortage.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-green-600 font-medium">No {memberLower}s below the {threshold}% threshold.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertTriangle size={16} />
            <span>{shortage.length} {memberLower}{shortage.length > 1 ? "s" : ""} below the {threshold}% minimum attendance threshold</span>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr>
                  <th className="table-th">{t.member}</th>
                  <th className="table-th">Roll No.</th>
                  <th className="table-th">{t.course}</th>
                  <th className="table-th text-center">Present/Total</th>
                  <th className="table-th text-center">Attendance %</th>
                  <th className="table-th text-center">Shortfall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {shortage.map((item) => {
                  const pct = Math.round(item.attendancePct);
                  const shortfall = Math.round(threshold - pct);
                  return (
                    <tr key={item.student.id} className="hover:bg-red-50/30">
                      <td className="table-td font-medium">{item.student.user?.name}</td>
                      <td className="table-td font-mono text-sm">{item.student.rollNumber}</td>
                      <td className="table-td text-muted-foreground">{item.student.course?.name ?? "—"}</td>
                      <td className="table-td text-center">{item.present}/{item.total}</td>
                      <td className="table-td text-center"><span className="text-red-600 font-bold">{pct}%</span></td>
                      <td className="table-td text-center"><span className="text-red-500 text-sm font-medium">-{shortfall}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
