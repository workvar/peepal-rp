"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import { Plus, Droplet } from "lucide-react";
import toast from "react-hot-toast";
import { LIST_BLOOD_UNITS, LIST_BLOOD_REQUESTS } from "@/graphql/queries/extended";
import {
  ADD_BLOOD_UNIT, ISSUE_BLOOD_UNIT, UPDATE_BLOOD_UNIT_STATUS, DELETE_BLOOD_UNIT,
  CREATE_BLOOD_REQUEST, FULFILL_BLOOD_REQUEST, CANCEL_BLOOD_REQUEST,
} from "@/graphql/mutations/extended";
import { LIST_PATIENT_OPTIONS } from "@/graphql/queries/clinical";
import type { PickerPatient } from "../appointments/types";
import SearchableSelect from "@/components/ui/SearchableSelect";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS = ["whole", "rbc", "plasma", "platelets", "cryo"];
const patientLabel = (p: PickerPatient) => `${p.firstName} ${p.lastName ?? ""} (${p.mrn})`.replace(/\s+/g, " ").trim();

const unitVariant = (s: string): "green" | "yellow" | "blue" | "gray" | "red" =>
  s === "available" ? "green" : s === "reserved" ? "yellow" : s === "issued" ? "blue" : s === "expired" ? "red" : "gray";

export default function BloodBankPage() {
  const refetchQueries = [
    { query: LIST_BLOOD_UNITS, variables: {} },
    { query: LIST_BLOOD_REQUESTS, variables: {} },
  ];
  const { data: unitData, loading } = useQuery(LIST_BLOOD_UNITS, { variables: {} });
  const { data: reqData } = useQuery(LIST_BLOOD_REQUESTS, { variables: {} });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });

  const [addMut] = useMutation(ADD_BLOOD_UNIT, { refetchQueries });
  const [issueMut] = useMutation(ISSUE_BLOOD_UNIT, { refetchQueries });
  const [statusMut] = useMutation(UPDATE_BLOOD_UNIT_STATUS, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_BLOOD_UNIT, { refetchQueries });
  const [requestMut] = useMutation(CREATE_BLOOD_REQUEST, { refetchQueries });
  const [fulfillMut] = useMutation(FULFILL_BLOOD_REQUEST, { refetchQueries });
  const [cancelReqMut] = useMutation(CANCEL_BLOOD_REQUEST, { refetchQueries });

  const units = unitData?.bloodUnits ?? [];
  const requests = reqData?.bloodRequests ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];

  const [tab, setTab] = useState<"units" | "requests">("units");
  const [showAdd, setShowAdd] = useState(false);
  const [showReq, setShowReq] = useState(false);
  const [issuing, setIssuing] = useState<{ id: string; bag: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [unitForm, setUnitForm] = useState({ bag_number: "", blood_group: "O+", component: "whole", volume_ml: "", donor_name: "", collected_date: "", expiry_date: "" });
  const [reqForm, setReqForm] = useState({ patient_id: "", blood_group: "O+", component: "whole", units_required: "1", notes: "" });
  const [issuePatient, setIssuePatient] = useState("");

  const addUnit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await addMut({ variables: { input: {
        bagNumber: unitForm.bag_number.trim(), bloodGroup: unitForm.blood_group, component: unitForm.component,
        volumeMl: parseInt(unitForm.volume_ml, 10) || 0, donorName: unitForm.donor_name || null,
        collectedDate: unitForm.collected_date || null, expiryDate: unitForm.expiry_date || null,
      } } });
      toast.success("Unit added"); setShowAdd(false);
      setUnitForm({ bag_number: "", blood_group: "O+", component: "whole", volume_ml: "", donor_name: "", collected_date: "", expiry_date: "" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };

  const issue = async (e: React.FormEvent) => {
    e.preventDefault(); if (!issuing || !issuePatient) return; setSaving(true);
    try { await issueMut({ variables: { id: issuing.id, patientId: issuePatient } }); toast.success("Issued"); setIssuing(null); setIssuePatient(""); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };

  const request = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await requestMut({ variables: { input: {
        patientId: reqForm.patient_id, bloodGroup: reqForm.blood_group, component: reqForm.component,
        unitsRequired: parseInt(reqForm.units_required, 10) || 1, notes: reqForm.notes || null,
      } } });
      toast.success("Request created"); setShowReq(false);
      setReqForm({ patient_id: "", blood_group: "O+", component: "whole", units_required: "1", notes: "" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };

  const tabBtn = (t: "units" | "requests", label: string) => (
    <button onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-lg ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

  return (
    <div>
      <Header title="Blood Bank" subtitle="Blood unit stock, issue, and patient requests" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">{tabBtn("units", "Stock")}{tabBtn("requests", "Requests")}</div>
        <Can module="bloodbank" action="create">
          {tab === "units"
            ? <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Unit</button>
            : <button className="btn-primary flex items-center gap-2" onClick={() => setShowReq(true)}><Plus size={16} /> New Request</button>}
        </Can>
      </div>

      {loading ? <LoadingSpinner /> : tab === "units" ? (
        units.length === 0 ? <div className="card text-center py-12 text-muted-foreground/70">No blood units in stock.</div> : (
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr>
                <th className="table-th">Bag</th><th className="table-th">Group</th><th className="table-th">Component</th>
                <th className="table-th">Expiry</th><th className="table-th">Status</th><th className="table-th">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border/60">
                {units.map((u: { id: string; bagNumber: string; bloodGroup: string; component: string; expiryDate?: string | null; status: string; issuedToName?: string | null }) => (
                  <tr key={u.id} className="hover:bg-muted/40">
                    <td className="table-td font-mono text-xs">{u.bagNumber}</td>
                    <td className="table-td"><Badge label={u.bloodGroup} variant="red" /></td>
                    <td className="table-td capitalize">{u.component}</td>
                    <td className="table-td text-xs">{u.expiryDate || "—"}</td>
                    <td className="table-td"><Badge label={u.status} variant={unitVariant(u.status)} className="capitalize" />{u.issuedToName ? <span className="text-xs text-muted-foreground ml-1">→ {u.issuedToName}</span> : null}</td>
                    <td className="table-td">
                      <Can module="bloodbank" action="edit">
                        {(u.status === "available" || u.status === "reserved") && (
                          <button className="text-sm text-blue-600 hover:underline mr-2" onClick={() => setIssuing({ id: u.id, bag: u.bagNumber })}>Issue</button>
                        )}
                        {u.status === "available" && (
                          <button className="text-xs text-amber-600 hover:underline mr-2" onClick={() => statusMut({ variables: { id: u.id, status: "discarded" } })}>Discard</button>
                        )}
                      </Can>
                      {u.status !== "issued" && (
                        <Can module="bloodbank" action="delete">
                          <button className="text-xs text-red-500 hover:underline" onClick={() => deleteMut({ variables: { id: u.id } })}>Delete</button>
                        </Can>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        requests.length === 0 ? <div className="card text-center py-12 text-muted-foreground/70">No blood requests.</div> : (
          <div className="space-y-3">
            {requests.map((r: { id: string; patientName: string; patientMrn: string; bloodGroup: string; component: string; unitsRequired: number; status: string; requestDate?: string | null }) => (
              <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Droplet size={18} className="text-red-500" />
                  <div>
                    <div className="font-medium">{r.patientName} <span className="text-xs text-muted-foreground/70">({r.patientMrn})</span></div>
                    <div className="text-xs text-muted-foreground/70">{r.unitsRequired} × {r.bloodGroup} {r.component} · {r.requestDate}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={r.status} variant={r.status === "fulfilled" ? "green" : r.status === "cancelled" ? "gray" : "yellow"} className="capitalize" />
                  {r.status === "pending" && (
                    <Can module="bloodbank" action="edit">
                      <button className="btn-secondary text-xs" onClick={() => fulfillMut({ variables: { id: r.id } })}>Fulfill</button>
                      <button className="text-xs text-red-500 hover:underline" onClick={() => cancelReqMut({ variables: { id: r.id } })}>Cancel</button>
                    </Can>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add unit */}
      <Modal title="Add Blood Unit" isOpen={showAdd} onClose={() => setShowAdd(false)}>
        <form onSubmit={addUnit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Bag Number</label><input className="input-field" value={unitForm.bag_number} required onChange={(e) => setUnitForm({ ...unitForm, bag_number: e.target.value })} /></div>
            <div><label className="block text-sm font-medium mb-1">Group</label><select className="input-field" value={unitForm.blood_group} onChange={(e) => setUnitForm({ ...unitForm, blood_group: e.target.value })}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Component</label><select className="input-field" value={unitForm.component} onChange={(e) => setUnitForm({ ...unitForm, component: e.target.value })}>{COMPONENTS.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Volume (ml)</label><input type="number" className="input-field" value={unitForm.volume_ml} onChange={(e) => setUnitForm({ ...unitForm, volume_ml: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Collected</label><input type="date" className="input-field" value={unitForm.collected_date} onChange={(e) => setUnitForm({ ...unitForm, collected_date: e.target.value })} /></div>
            <div><label className="block text-sm font-medium mb-1">Expiry</label><input type="date" className="input-field" value={unitForm.expiry_date} onChange={(e) => setUnitForm({ ...unitForm, expiry_date: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Donor</label><input className="input-field" value={unitForm.donor_name} onChange={(e) => setUnitForm({ ...unitForm, donor_name: e.target.value })} /></div>
          <div className="flex gap-3 pt-2"><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Add"}</button><button type="button" className="btn-secondary flex-1" onClick={() => setShowAdd(false)}>Cancel</button></div>
        </form>
      </Modal>

      {/* Issue */}
      <Modal title={issuing ? `Issue ${issuing.bag}` : "Issue"} isOpen={!!issuing} onClose={() => setIssuing(null)}>
        <form onSubmit={issue} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Patient</label>
            <SearchableSelect
              value={issuePatient}
              onChange={setIssuePatient}
              options={patients.map((p) => ({ value: p.id, label: patientLabel(p) }))}
              placeholder="Select patient…"
              required
            /></div>
          <div className="flex gap-3 pt-2"><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Issuing…" : "Issue"}</button><button type="button" className="btn-secondary flex-1" onClick={() => setIssuing(null)}>Cancel</button></div>
        </form>
      </Modal>

      {/* Request */}
      <Modal title="New Blood Request" isOpen={showReq} onClose={() => setShowReq(false)}>
        <form onSubmit={request} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Patient</label>
            <SearchableSelect
              value={reqForm.patient_id}
              onChange={(v) => setReqForm({ ...reqForm, patient_id: v })}
              options={patients.map((p) => ({ value: p.id, label: patientLabel(p) }))}
              placeholder="Select patient…"
              required
            /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium mb-1">Group</label><select className="input-field" value={reqForm.blood_group} onChange={(e) => setReqForm({ ...reqForm, blood_group: e.target.value })}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Component</label><select className="input-field" value={reqForm.component} onChange={(e) => setReqForm({ ...reqForm, component: e.target.value })}>{COMPONENTS.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Units</label><input type="number" min="1" className="input-field" value={reqForm.units_required} onChange={(e) => setReqForm({ ...reqForm, units_required: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Notes</label><input className="input-field" value={reqForm.notes} onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })} /></div>
          <div className="flex gap-3 pt-2"><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Create"}</button><button type="button" className="btn-secondary flex-1" onClick={() => setShowReq(false)}>Cancel</button></div>
        </form>
      </Modal>
    </div>
  );
}
