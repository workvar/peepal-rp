"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { LIST_ATTENDANCE, ATTENDANCE_SUMMARY } from "@/graphql/queries/attendance";
import Header from "@/components/layout/Header";
import QueryError from "@/components/ui/QueryError";
import { TableSkeleton } from "@/components/ui/skeletons";
import { Badge } from "@/components/ui/badge";
import AttendanceBulkUpload from "./AttendanceBulkUpload";
import { useTerminology, useTenantType } from "@/store/hooks/useTerminology";
import { moduleAllowedForIndustry } from "@/lib/access";
import type { GqlAttendanceRecord } from "@/types/pages/attendance/page";
import MarkAttendanceModal from "./mark/MarkAttendanceModal";
import { Plus, Search, X, Loader2 } from "lucide-react";
import Can from "@/components/access/Can";

const LIST_ENTITIES_MINIMAL = gql`
  query AttendanceEntityNames {
    employees { id employeeId user { name } }
    students  { id rollNumber  user { name } }
  }
`;

const PAGE_LIMIT = 100;

const statusVariant: Record<string, "green" | "red" | "yellow"> = {
  present: "green", absent: "red", late: "yellow",
};

type Tab = "all" | "employee" | "student";
type EntityInfo = { name: string; code: string };

export default function AttendancePage() {
  const t = useTerminology();
  // Outside education there is no member population, so attendance is
  // employee-only and the member tab must not appear at all.
  const hasMembers = moduleAllowedForIndustry("students", useTenantType());
  const tabs: Tab[] = hasMembers ? ["all", "employee", "student"] : ["all", "employee"];
  // Roll numbers only exist for education members; elsewhere the column is
  // just the employee ID.
  const idColumn = hasMembers ? "ID / Roll No." : "Employee ID";
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "present" | "absent" | "late">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);

  // Pass entityType to server when on a specific tab — fixes "Employees 0" bug.
  const entityTypeVar = activeTab === "all" ? undefined : activeTab;

  // search + entityType + entityId all go to the backend.
  // Changing any variable causes Apollo to re-fetch from offset 0 automatically.
  const { data, loading, error, refetch, fetchMore } = useQuery(LIST_ATTENDANCE, {
    variables: {
      limit: PAGE_LIMIT,
      offset: 0,
      entityType: entityTypeVar,
      search: search || undefined,
    },
    notifyOnNetworkStatusChange: true,
  });

  // Load entity names for display only (not for filtering — that's now server-side).
  const { data: entityData } = useQuery(LIST_ENTITIES_MINIMAL);

  // Accurate totals for tab pills.
  const { data: empSummary } = useQuery(ATTENDANCE_SUMMARY, {
    variables: { entityType: "employee" },
  });
  const { data: stuSummary } = useQuery(ATTENDANCE_SUMMARY, {
    variables: { entityType: "student" },
    skip: !hasMembers,
  });

  const records: GqlAttendanceRecord[] = data?.attendance ?? [];

  // Update hasMore only for fresh loads (initial load or after variable change).
  // After fetchMore, Apollo merges pages so data.attendance.length > PAGE_LIMIT —
  // don't use it to infer hasMore then; the loadMore callback handles that.
  useEffect(() => {
    if (data?.attendance && data.attendance.length <= PAGE_LIMIT) {
      setHasMore(data.attendance.length === PAGE_LIMIT);
    }
  }, [data?.attendance]);

  // id → { name, code } for display only.
  const entityMap = useMemo<Record<string, EntityInfo>>(() => {
    const map: Record<string, EntityInfo> = {};
    for (const e of entityData?.employees ?? []) map[e.id] = { name: e.user?.name ?? "Unknown", code: e.employeeId };
    for (const s of entityData?.students  ?? []) map[s.id] = { name: s.user?.name ?? "Unknown", code: s.rollNumber };
    return map;
  }, [entityData]);

  // Accurate tab totals from summary aggregation.
  const tabCounts = useMemo(() => {
    const empTotal = empSummary?.attendanceSummary?.reduce(
      (s: number, r: { total: number }) => s + r.total, 0
    ) ?? null;
    const stuTotal = stuSummary?.attendanceSummary?.reduce(
      (s: number, r: { total: number }) => s + r.total, 0
    ) ?? null;
    return {
      all:      empTotal !== null && stuTotal !== null ? empTotal + stuTotal : records.length,
      employee: empTotal ?? records.filter((r) => r.entityType === "employee").length,
      student:  stuTotal ?? records.filter((r) => r.entityType === "student").length,
    };
  }, [empSummary, stuSummary, records]);

  // All filtering (search, entityType) is done server-side.
  // Only client-side filters remaining: status dropdown and date range.
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterFrom && r.date < filterFrom) return false;
      if (filterTo && r.date > filterTo) return false;
      return true;
    });
  }, [records, filterStatus, filterFrom, filterTo]);

  // Load next page from server when user scrolls near bottom
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: { limit: PAGE_LIMIT, offset: records.length, entityType: entityTypeVar, search: search || undefined },
        updateQuery(prev, { fetchMoreResult }) {
          if (!fetchMoreResult?.attendance?.length) return prev;
          return { attendance: [...prev.attendance, ...fetchMoreResult.attendance] };
        },
      });
      const newBatch = result.data?.attendance ?? [];
      setHasMore(newBatch.length === PAGE_LIMIT);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchMore, records.length, loadingMore, hasMore]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
      void loadMore();
    }
  }

  // When tab / filters change, scroll back to top
  useEffect(() => {
    tableRef.current?.scrollTo({ top: 0 });
  }, [activeTab, search, filterStatus, filterFrom, filterTo]);

  const hasFilters = search || filterStatus || filterFrom || filterTo;

  function clearFilters() {
    setSearch("");
    setFilterStatus("");
    setFilterFrom("");
    setFilterTo("");
  }

  return (
    <div>
      <Header
        title={t.attendance}
        subtitle={`Track daily ${t.attendance.toLowerCase()} for ${hasMembers ? `${t.member_plural.toLowerCase()} and ` : ""}employees`}
        action={
          <div className="flex gap-2">
            <AttendanceBulkUpload onFinished={(s) => { if (s.successful > 0) refetch(); }} />
            <Can module="attendance" action="create">
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Mark {t.attendance}
              </button>
            </Can>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab === "all" ? "All" : tab === "employee" ? "Employees" : t.member_plural}
            <span className={[
              "ml-2 text-xs px-1.5 py-0.5 rounded-full font-mono",
              activeTab === tab ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            ].join(" ")}>
              {tabCounts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            className="input-field pl-8 w-full"
            placeholder="Search name, ID, date, remarks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input-field w-32"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "" | "present" | "absent" | "late")}
        >
          <option value="">All statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
        </select>

        <input type="date" className="input-field w-36" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} title="From date" />
        <span className="text-muted-foreground text-sm">to</span>
        <input type="date" className="input-field w-36" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} title="To date" />

        {hasFilters && (
          <button onClick={clearFilters} className="btn-ghost flex items-center gap-1 text-xs">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        {hasMore && <span className="ml-1 text-muted-foreground/60">· scroll to load more</span>}
      </p>

      {error && <QueryError message={error.message} onRetry={() => void refetch()} />}

      {loading && records.length === 0 ? (
        <TableSkeleton
          columns={["Date", "Name", idColumn, "Type", "Status", "Remarks"]}
          rows={8}
          colWidths={["w-24", "w-40", "w-24", "w-20", "w-20", "w-40"]}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div
            ref={tableRef}
            onScroll={handleScroll}
            className="overflow-auto"
            style={{ maxHeight: "calc(100vh - 320px)", minHeight: 200 }}
          >
            <table className="w-full">
              <thead className="bg-muted/40 sticky top-0 z-10">
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Name</th>
                  <th className="table-th">{idColumn}</th>
                  {activeTab === "all" && <th className="table-th">Type</th>}
                  <th className="table-th">Status</th>
                  <th className="table-th">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((r) => {
                  const info = entityMap[r.entityId];
                  return (
                    <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                      <td className="table-td font-mono text-sm">{r.date?.slice(0, 10)}</td>
                      <td className="table-td font-medium">
                        {info?.name ?? <span className="text-muted-foreground text-xs italic">Unknown</span>}
                      </td>
                      <td className="table-td font-mono text-xs text-muted-foreground">
                        {info?.code ?? r.entityId.slice(0, 8) + "…"}
                      </td>
                      {activeTab === "all" && (
                        <td className="table-td capitalize text-muted-foreground">{r.entityType}</td>
                      )}
                      <td className="table-td">
                        <Badge label={r.status} variant={statusVariant[r.status] ?? "gray"} />
                      </td>
                      <td className="table-td text-muted-foreground">{r.remarks || "—"}</td>
                    </tr>
                  );
                })}

                {/* Load-more indicator */}
                {(hasMore || loadingMore) && (
                  <tr>
                    <td colSpan={activeTab === "all" ? 6 : 5} className="py-4 text-center">
                      {loadingMore
                        ? <span className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 size={13} className="animate-spin" /> Loading more…</span>
                        : <span className="text-xs text-muted-foreground">Scroll to load more</span>
                      }
                    </td>
                  </tr>
                )}

                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={activeTab === "all" ? 6 : 5} className="table-td text-center text-muted-foreground/70 py-10">
                      {hasFilters ? "No records match the current filters." : `No ${t.attendance.toLowerCase()} records yet.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MarkAttendanceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => { void refetch(); }}
      />
    </div>
  );
}
