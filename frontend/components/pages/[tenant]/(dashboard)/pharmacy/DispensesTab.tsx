"use client";

// Dispenses tab: history table + new-dispense modal with stock-aware lines.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { Plus, Trash2 } from "lucide-react";
import type { GqlDrug, GqlDispense, DispenseForm, DispenseLineForm } from "./types";
import { emptyDispenseForm } from "./types";
import type { PickerPatient } from "../appointments/types";

export default function DispensesTab({
  dispenses,
  drugs,
  patients,
  onSave,
}: {
  dispenses: GqlDispense[];
  drugs: GqlDrug[];
  patients: PickerPatient[];
  onSave: (form: DispenseForm) => Promise<void>;
}) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DispenseForm>(emptyDispenseForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!showModal) return;
    setForm({
      ...emptyDispenseForm,
      date: new Date().toISOString().slice(0, 10),
      lines: [{ drug_id: "", qty: "1" }],
    });
  }, [showModal]);

  const set = (patch: Partial<DispenseForm>) => setForm((f) => ({ ...f, ...patch }));
  const setLine = (i: number, patch: Partial<DispenseLineForm>) =>
    setForm((f) => ({ ...f, lines: f.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));

  const activeDrugs = drugs.filter((d) => d.active);
  const drugById = (id: string) => drugs.find((d) => d.id === id);

  const total = form.lines.reduce((sum, l) => {
    const d = drugById(l.drug_id);
    return sum + (d ? (parseFloat(l.qty) || 0) * d.unitPrice : 0);
  }, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const q = search.toLowerCase();
  const filtered = q
    ? dispenses.filter((d) =>
        [d.patientName, d.patientMrn, ...d.items.map((i) => i.drugName)].some((v) =>
          v.toLowerCase().includes(q),
        ),
      )
    : dispenses;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        <input className="input-field flex-1 min-w-48" placeholder="Search patient, MRN, drug…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <Can module="pharmacy" action="create">
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Dispense
          </button>
        </Can>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">
          No dispenses recorded yet.
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Patient</th>
                <th className="table-th">Items</th>
                <th className="table-th">Total</th>
                <th className="table-th">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-muted/40">
                  <td className="table-td font-mono">{d.date}</td>
                  <td className="table-td font-medium">
                    {d.patientName}
                    <span className="text-xs text-muted-foreground/70 ml-1">({d.patientMrn})</span>
                  </td>
                  <td className="table-td text-sm">
                    {d.items.map((i) => `${i.drugName} × ${i.qty}`).join(", ")}
                  </td>
                  <td className="table-td font-mono">{d.totalAmount.toFixed(2)}</td>
                  <td className="table-td">{d.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="New Dispense" isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Patient</label>
              <SearchableSelect
                value={form.patient_id}
                onChange={(v) => set({ patient_id: v })}
                required
                placeholder="Select patient…"
                searchPlaceholder="Search name or MRN…"
                options={patients.map((p) => ({
                  value: p.id,
                  label: [p.firstName, p.lastName].filter(Boolean).join(" ") || p.mrn,
                  sublabel: p.mrn,
                }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Date</label>
              <input type="date" className="input-field" value={form.date} required
                onChange={(e) => set({ date: e.target.value })} />
            </div>
          </div>

          <fieldset className="border border-border rounded-lg p-3 space-y-2">
            <legend className="text-sm font-medium text-foreground/80 px-1">Drugs</legend>
            {form.lines.map((l, i) => {
              const d = drugById(l.drug_id);
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-7">
                    <SearchableSelect
                      value={l.drug_id}
                      onChange={(v) => setLine(i, { drug_id: v })}
                      required
                      placeholder="Select drug…"
                      searchPlaceholder="Search drug…"
                      options={activeDrugs.map((drug) => ({
                        value: drug.id,
                        label: `${drug.name}${drug.strength ? ` ${drug.strength}` : ""}`,
                        sublabel: `stock: ${drug.stockQty}`,
                      }))}
                    />
                  </div>
                  <input type="number" min="0.5" step="0.5" className="input-field col-span-2"
                    placeholder="Qty" value={l.qty} required
                    onChange={(e) => setLine(i, { qty: e.target.value })} />
                  <span className="col-span-2 text-sm font-mono text-muted-foreground text-right">
                    {d ? ((parseFloat(l.qty) || 0) * d.unitPrice).toFixed(2) : "—"}
                  </span>
                  <button type="button" className="col-span-1 text-red-500 hover:text-red-700 p-2"
                    onClick={() => set({ lines: form.lines.filter((_, idx) => idx !== i) })}
                    disabled={form.lines.length === 1} aria-label="Remove line">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
            <button type="button" className="btn-secondary flex items-center gap-1 text-sm"
              onClick={() => set({ lines: [...form.lines, { drug_id: "", qty: "1" }] })}>
              <Plus size={14} /> Add Drug
            </button>
          </fieldset>

          <div className="flex items-end justify-between gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
              <input className="input-field" value={form.notes}
                onChange={(e) => set({ notes: e.target.value })} />
            </div>
            <div className="text-sm font-semibold whitespace-nowrap pb-2">
              Total: <span className="font-mono">{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? "Saving…" : "Dispense"}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
