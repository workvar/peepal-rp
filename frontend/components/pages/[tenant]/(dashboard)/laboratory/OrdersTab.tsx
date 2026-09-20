"use client";

// Lab orders: list with status, a New Order modal (patient + tests), and a
// Result Entry modal that flags values against reference ranges.

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import { Plus, FlaskConical, X } from "lucide-react";
import type { GqlLabTest, GqlLabOrder, LabTestForm } from "./types";
import { flagVariant } from "./types";
import TestPickerGrid from "./TestPickerGrid";
import TestFormModal from "./TestFormModal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import type { PickerPatient, PickerClinician } from "../appointments/types";

const statusVariant = (s: string) =>
  s === "resulted" ? "green" : s === "cancelled" ? "gray" : s === "collected" ? "blue" : "yellow";

export default function OrdersTab({
  orders, tests, patients, clinicians, onCreate, onEnterResults, onCancel, onSaveTest, onDeleteTest,
}: {
  orders: GqlLabOrder[];
  tests: GqlLabTest[];
  patients: PickerPatient[];
  clinicians: PickerClinician[];
  onCreate: (input: { patientId: string; orderedById: string; notes: string; testIds: string[] }) => Promise<void>;
  onEnterResults: (orderId: string, results: { itemId: string; resultValue: string }[]) => Promise<void>;
  onCancel: (o: GqlLabOrder) => void;
  onSaveTest: (editing: GqlLabTest | null, form: LabTestForm) => Promise<void>;
  onDeleteTest: (t: GqlLabTest) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [resulting, setResulting] = useState<GqlLabOrder | null>(null);
  const [saving, setSaving] = useState(false);

  // Inline test add/edit from within the order modal.
  const [showTestForm, setShowTestForm] = useState(false);
  const [editingTest, setEditingTest] = useState<GqlLabTest | null>(null);
  const openAddTest = () => { setEditingTest(null); setShowTestForm(true); };
  const openEditTest = (t: GqlLabTest) => { setEditingTest(t); setShowTestForm(true); };

  // New order form.
  const [patientId, setPatientId] = useState("");
  const [clinicianId, setClinicianId] = useState("");
  const [notes, setNotes] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const resetNew = () => { setPatientId(""); setClinicianId(""); setNotes(""); setPicked([]); };
  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || picked.length === 0) return;
    setSaving(true);
    try {
      await onCreate({ patientId, orderedById: clinicianId, notes, testIds: picked });
      setShowNew(false);
      resetNew();
    } finally {
      setSaving(false);
    }
  };

  // Result entry state: itemId → value.
  const [results, setResults] = useState<Record<string, string>>({});
  const openResult = (o: GqlLabOrder) => {
    setResults(Object.fromEntries(o.items.map((it) => [it.id, it.resultValue ?? ""])));
    setResulting(o);
  };
  const submitResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resulting) return;
    const payload = Object.entries(results)
      .filter(([, v]) => v.trim() !== "")
      .map(([itemId, resultValue]) => ({ itemId, resultValue }));
    if (payload.length === 0) return;
    setSaving(true);
    try {
      await onEnterResults(resulting.id, payload);
      setResulting(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Can module="laboratory" action="create">
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowNew(true)}>
            <Plus size={16} /> New Order
          </button>
        </Can>
      </div>

      {orders.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No lab orders yet.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{o.patientName} <span className="text-xs text-muted-foreground/70">({o.patientMrn})</span></div>
                  <div className="text-xs text-muted-foreground/70">
                    {o.orderDate}{o.orderedByName ? ` · ${o.orderedByName}` : ""}
                    {o.encounterId ? " · from encounter" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={o.status} variant={statusVariant(o.status)} className="capitalize" />
                  {o.status !== "cancelled" && (
                    <Can module="laboratory" action="edit">
                      <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => openResult(o)}>
                        <FlaskConical size={14} /> Results
                      </button>
                    </Can>
                  )}
                  {o.status === "ordered" && (
                    <Can module="laboratory" action="edit">
                      <button className="text-xs text-red-500 hover:underline" onClick={() => onCancel(o)}>Cancel</button>
                    </Can>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {o.items.map((it) => (
                  <span key={it.id} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1 text-xs">
                    {it.testName}
                    {it.resultValue ? (
                      <>
                        <span className="font-mono font-semibold">{it.resultValue}{it.unit ? ` ${it.unit}` : ""}</span>
                        {it.flag && <Badge label={it.flag} variant={flagVariant(it.flag)} className="capitalize" />}
                      </>
                    ) : (
                      <span className="text-muted-foreground/60">pending</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New order */}
      <Modal title="New Lab Order" isOpen={showNew} onClose={() => { setShowNew(false); resetNew(); }}>
        <form onSubmit={submitNew} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Patient</label>
              <SearchableSelect
                value={patientId}
                onChange={setPatientId}
                required
                placeholder="Select patient…"
                searchPlaceholder="Search patient or MRN…"
                options={patients.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName ?? ""}`.trim(), sublabel: p.mrn }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Ordering clinician</label>
              <SearchableSelect
                value={clinicianId}
                onChange={setClinicianId}
                placeholder="— none —"
                searchPlaceholder="Search clinician…"
                options={clinicians.map((c) => ({ value: c.id, label: c.user?.name ?? "Unnamed" }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Tests ({picked.length} selected)</label>
            <TestPickerGrid
              tests={tests}
              picked={picked}
              onToggle={togglePick}
              onAdd={openAddTest}
              onEdit={openEditTest}
              onDelete={onDeleteTest}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
            <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving || !patientId || picked.length === 0}>
              {saving ? "Saving…" : "Create Order"}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={() => { setShowNew(false); resetNew(); }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Inline add/edit test (opened from the picker grid) */}
      <TestFormModal
        isOpen={showTestForm}
        editing={editingTest}
        onClose={() => { setShowTestForm(false); setEditingTest(null); }}
        onSave={onSaveTest}
      />

      {/* Result entry */}
      <Modal title={resulting ? `Results — ${resulting.patientName}` : "Results"}
        isOpen={!!resulting} onClose={() => setResulting(null)}>
        {resulting && (
          <form onSubmit={submitResults} className="space-y-3">
            {resulting.items.map((it) => (
              <div key={it.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{it.testName}</div>
                  <div className="text-xs text-muted-foreground/70">
                    {it.refText || (it.refLow || it.refHigh ? `${it.refLow}–${it.refHigh} ${it.unit ?? ""}` : "qualitative")}
                  </div>
                </div>
                <input className="input-field w-32" placeholder="value"
                  value={results[it.id] ?? ""}
                  onChange={(e) => setResults((r) => ({ ...r, [it.id]: e.target.value }))} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? "Saving…" : "Save Results"}
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => setResulting(null)}>
                <X size={14} className="inline" /> Close
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
