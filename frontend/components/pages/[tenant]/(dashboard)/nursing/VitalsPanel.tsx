"use client";

// Vitals charting for one admission: record a set + trend the recent history.

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { LIST_VITALS } from "@/graphql/queries/operations";
import { RECORD_VITALS } from "@/graphql/mutations/operations";

type Vitals = {
  id: string; recordedByName?: string | null; recordedAt: string;
  tempC: number; pulse: number; respRate: number; bpSystolic: number;
  bpDiastolic: number; spo2: number; painScore: number; notes?: string | null;
};

const emptyForm = { tempC: "", pulse: "", respRate: "", bpSystolic: "", bpDiastolic: "", spo2: "", painScore: "", notes: "" };

export default function VitalsPanel({ admissionId }: { admissionId: string }) {
  const { data, loading } = useQuery(LIST_VITALS, { variables: { admissionId } });
  const [recordMut] = useMutation(RECORD_VITALS, {
    refetchQueries: [{ query: LIST_VITALS, variables: { admissionId } }],
  });

  const [show, setShow] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof emptyForm>) => setForm((f) => ({ ...f, ...patch }));

  const rows: Vitals[] = data?.vitalsRecords ?? [];

  const num = (v: string) => (v === "" ? undefined : parseFloat(v));
  const int = (v: string) => (v === "" ? undefined : parseInt(v, 10));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await recordMut({ variables: { input: {
        admissionId, tempC: num(form.tempC), pulse: int(form.pulse), respRate: int(form.respRate),
        bpSystolic: int(form.bpSystolic), bpDiastolic: int(form.bpDiastolic), spo2: int(form.spo2),
        painScore: int(form.painScore), notes: form.notes || null,
      } } });
      toast.success("Vitals recorded");
      setShow(false); setForm(emptyForm);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record vitals");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Can module="nursing" action="create">
          <button className="btn-primary flex items-center gap-2" onClick={() => setShow(true)}>
            <Plus size={16} /> Record Vitals
          </button>
        </Can>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground/70 py-6 text-center">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card text-center py-10 text-muted-foreground/70">No vitals charted yet.</div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Time</th>
                <th className="table-th">Temp °C</th>
                <th className="table-th">Pulse</th>
                <th className="table-th">RR</th>
                <th className="table-th">BP</th>
                <th className="table-th">SpO₂</th>
                <th className="table-th">Pain</th>
                <th className="table-th">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-muted/40">
                  <td className="table-td whitespace-nowrap text-xs">{new Date(v.recordedAt).toLocaleString()}</td>
                  <td className="table-td font-mono">{v.tempC || "—"}</td>
                  <td className="table-td font-mono">{v.pulse || "—"}</td>
                  <td className="table-td font-mono">{v.respRate || "—"}</td>
                  <td className="table-td font-mono">{v.bpSystolic || v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : "—"}</td>
                  <td className="table-td font-mono">{v.spo2 || "—"}</td>
                  <td className="table-td font-mono">{v.painScore || "—"}</td>
                  <td className="table-td text-xs text-muted-foreground">{v.recordedByName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Record Vitals" isOpen={show} onClose={() => setShow(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Temp °C" value={form.tempC} onChange={(v) => set({ tempC: v })} step="0.1" />
            <Field label="Pulse" value={form.pulse} onChange={(v) => set({ pulse: v })} />
            <Field label="Resp Rate" value={form.respRate} onChange={(v) => set({ respRate: v })} />
            <Field label="BP Systolic" value={form.bpSystolic} onChange={(v) => set({ bpSystolic: v })} />
            <Field label="BP Diastolic" value={form.bpDiastolic} onChange={(v) => set({ bpDiastolic: v })} />
            <Field label="SpO₂ %" value={form.spo2} onChange={(v) => set({ spo2: v })} />
            <Field label="Pain (0-10)" value={form.painScore} onChange={(v) => set({ painScore: v })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
            <input className="input-field" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Record"}</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShow(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, value, onChange, step }: { label: string; value: string; onChange: (v: string) => void; step?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/80 mb-1">{label}</label>
      <input type="number" step={step ?? "1"} className="input-field" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
