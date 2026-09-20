"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import { useTerminology } from "@/store/hooks/useTerminology";
import { LIST_LEAVES, LIST_LEAVE_TYPES, MY_LEAVE_BALANCE } from "@/graphql/queries/leaves";
import { APPLY_LEAVE, REVIEW_LEAVE } from "@/graphql/mutations/leaves";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import QueryError from "@/components/ui/QueryError";
import { TableSkeleton, StatRowSkeleton } from "@/components/ui/skeletons";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/errors";
import type { GqlLeave, GqlLeaveType, GqlLeaveBalance } from "@/types/pages/leaves/page";
import toast from "react-hot-toast";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import Can from "@/components/access/Can";
import SearchableSelect from "@/components/ui/SearchableSelect";

const statusVariant: Record<string, "green" | "red" | "yellow" | "gray"> = {
  approved: "green", rejected: "red", pending: "yellow",
};

export default function LeavesPage() {
  const t = useTerminology();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin";

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ leave_type: "", leave_type_id: "", from_date: "", to_date: "", reason: "" });

  const { data: leavesData, loading, error: leavesError, refetch } = useQuery(LIST_LEAVES);
  const { data: leaveTypesData } = useQuery(LIST_LEAVE_TYPES);
  const { data: balanceData, loading: balanceLoading } = useQuery(MY_LEAVE_BALANCE, { skip: isAdmin });

  const leaves: GqlLeave[] = leavesData?.leaves ?? [];
  const leaveTypes: GqlLeaveType[] = leaveTypesData?.leaveTypes ?? [];
  const myBalances: GqlLeaveBalance[] = balanceData?.myLeaveBalance ?? [];

  const [applyLeaveMut] = useMutation(APPLY_LEAVE);
  const [reviewLeaveMut] = useMutation(REVIEW_LEAVE);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await applyLeaveMut({
        variables: {
          input: {
            leaveType: form.leave_type,
            leaveTypeId: form.leave_type_id || null,
            fromDate: form.from_date,
            toDate: form.to_date,
            reason: form.reason,
          },
        },
        refetchQueries: [{ query: LIST_LEAVES }],
      });
      toast.success("Leave applied");
      setShowModal(false);
      setForm({ leave_type: "", leave_type_id: "", from_date: "", to_date: "", reason: "" });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to apply leave"));
    }
  };

  const handleLeaveTypeChange = (id: string) => {
    const lt = leaveTypes.find((l) => l.id === id || l.code === id);
    setForm({ ...form, leave_type_id: lt?.id ?? "", leave_type: lt?.name ?? id });
  };

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    const reviewNote = status === "rejected" ? prompt("Rejection reason (optional):") ?? "" : "";
    try {
      await reviewLeaveMut({
        variables: { id, input: { status, reviewNote: reviewNote || null } },
        refetchQueries: [{ query: LIST_LEAVES }],
      });
      toast.success(status === "approved" ? "Leave approved" : "Leave rejected");
    } catch {
      toast.error("Failed to review leave");
    }
  };

  const filteredLeaves = search
    ? leaves.filter((l) => [l.applicant?.name, l.leaveTypeName, l.reason, l.status].some((v) => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : leaves;

  return (
    <div>
      <Header
        title={`${t.leave} Management`}
        subtitle={`Apply and manage ${t.leave.toLowerCase()} requests`}
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Apply Leave
          </button>
        }
      />

      {!isAdmin && balanceLoading && myBalances.length === 0 && (
        <div className="mb-4">
          <StatRowSkeleton count={4} />
        </div>
      )}
      {!isAdmin && myBalances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {myBalances.map((b) => (
            <div key={b.id} className="card py-3 px-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{b.leaveType?.name ?? b.leaveTypeId}</p>
              <div className="flex items-end gap-1 mt-1">
                <span className="text-2xl font-bold text-foreground">{b.total - b.used - b.pending}</span>
                <span className="text-sm text-muted-foreground/70 mb-0.5">/ {b.total}</span>
              </div>
              {b.pending > 0 && <p className="text-xs text-yellow-600 mt-0.5">{b.pending} pending</p>}
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <input className="input-field w-full" placeholder="Search leave type, reason, status…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {leavesError && <QueryError message={leavesError.message} onRetry={() => void refetch()} />}

      {loading && leaves.length === 0 ? (
        <TableSkeleton
          columns={
            isAdmin
              ? ['Applicant', 'Leave Type', 'From', 'To', 'Reason', 'Status', 'Actions']
              : ['Leave Type', 'From', 'To', 'Reason', 'Status']
          }
          rows={5}
          colWidths={
            isAdmin
              ? ['w-28', 'w-24', 'w-24', 'w-24', 'w-40', 'w-16', 'w-16']
              : ['w-24', 'w-24', 'w-24', 'w-40', 'w-16']
          }
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                {isAdmin && <th className="table-th">Applicant</th>}
                <th className="table-th">Leave Type</th>
                <th className="table-th">From</th>
                <th className="table-th">To</th>
                <th className="table-th">Reason</th>
                <th className="table-th">Status</th>
                {isAdmin && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredLeaves.map((l) => (
                <tr key={l.id} className="hover:bg-muted/40">
                  {isAdmin && <td className="table-td font-medium">{l.applicant?.name ?? "—"}</td>}
                  <td className="table-td">{l.leaveTypeName}</td>
                  <td className="table-td text-sm">{new Date(l.fromDate).toLocaleDateString()}</td>
                  <td className="table-td text-sm">{new Date(l.toDate).toLocaleDateString()}</td>
                  <td className="table-td text-muted-foreground max-w-xs truncate">{l.reason}</td>
                  <td className="table-td"><Badge label={l.status} variant={statusVariant[l.status] ?? "gray"} /></td>
                  {isAdmin && l.status === "pending" && (
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <Can module="leaves" action="edit">
                          <button onClick={() => handleReview(l.id, "approved")} className="text-green-600 hover:text-green-800"><CheckCircle size={16} /></button>
                          <button onClick={() => handleReview(l.id, "rejected")} className="text-red-500 hover:text-red-700"><XCircle size={16} /></button>
                        </Can>
                      </div>
                    </td>
                  )}
                  {isAdmin && l.status !== "pending" && <td className="table-td text-xs text-muted-foreground/70">{l.reviewNote || "—"}</td>}
                </tr>
              ))}
              {filteredLeaves.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center text-muted-foreground/70 py-8">No leave records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Apply for Leave" isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Leave Type</label>
            {leaveTypes.length > 0 ? (
              <SearchableSelect
                value={form.leave_type_id || form.leave_type}
                onChange={handleLeaveTypeChange}
                required
                placeholder="Select leave type..."
                options={leaveTypes.map((lt) => {
                  const bal = myBalances.find((b) => b.leaveTypeId === lt.id);
                  const remaining = bal ? bal.total - bal.used - bal.pending : null;
                  return {
                    value: lt.id ?? lt.code,
                    label: `${lt.name} (${lt.code})${remaining !== null ? ` — ${remaining} days left` : ""}`,
                  };
                })}
              />
            ) : (
              <input className="input-field" placeholder="e.g. Sick Leave" value={form.leave_type}
                onChange={(e) => setForm({ ...form, leave_type: e.target.value })} required />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">From Date</label>
              <input type="date" className="input-field" value={form.from_date}
                onChange={(e) => setForm({ ...form, from_date: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">To Date</label>
              <input type="date" className="input-field" value={form.to_date}
                onChange={(e) => setForm({ ...form, to_date: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Reason</label>
            <textarea className="input-field" rows={3} value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Submit</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
