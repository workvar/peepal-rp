"use client";

// Lab test catalog: searchable table + add/edit modal.

import { useState } from "react";
import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import TestFormModal from "./TestFormModal";
import type { GqlLabTest, LabTestForm } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function TestsTab({
  tests,
  onSave,
  onDelete,
  onBulkFinished,
}: {
  tests: GqlLabTest[];
  onSave: (editing: GqlLabTest | null, form: LabTestForm) => Promise<void>;
  onDelete: (t: GqlLabTest) => void;
  onBulkFinished?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GqlLabTest | null>(null);
  const [search, setSearch] = useState("");
  const [panelFilter, setPanelFilter] = useState("");

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const q = search.toLowerCase();
  const panels = Array.from(new Set(tests.map((t) => t.panel).filter(Boolean))) as string[];
  const filtered = tests
    .filter((t) => !panelFilter || t.panel === panelFilter)
    .filter((t) => !q || [t.name, t.code, t.category].some((v) => String(v ?? "").toLowerCase().includes(q)));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        <input className="input-field flex-1 min-w-48" placeholder="Search test or code…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="w-48">
          <SearchableSelect
            value={panelFilter}
            onChange={setPanelFilter}
            options={panels.map((p) => ({ value: p, label: p }))}
            placeholder="All panels"
          />
        </div>
        <Can module="laboratory" action="create">
          <BulkUploadButton resource="lab_tests" onFinished={(s) => { if (s.successful > 0) onBulkFinished?.(); }} />
        </Can>
        <Can module="laboratory" action="create">
          <button className="btn-primary flex items-center gap-2"
            onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={16} /> Add Test
          </button>
        </Can>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">
          No lab tests in the catalog yet.
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Code</th>
                <th className="table-th">Test</th>
                <th className="table-th">Panel</th>
                <th className="table-th">Sample</th>
                <th className="table-th">Reference</th>
                <th className="table-th">Price</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-muted/40">
                  <td className="table-td font-mono text-xs">{t.code}</td>
                  <td className="table-td">
                    <span className="font-medium">{t.name}</span>
                    {t.category && <div className="text-xs text-muted-foreground/70">{t.category}</div>}
                  </td>
                  <td className="table-td">{t.panel || "—"}</td>
                  <td className="table-td capitalize">{t.sampleType}</td>
                  <td className="table-td text-xs text-muted-foreground">
                    {t.refText || (t.refLow || t.refHigh ? `${t.refLow}–${t.refHigh} ${t.unit ?? ""}` : "—")}
                  </td>
                  <td className="table-td font-mono">{t.price.toFixed(2)}</td>
                  <td className="table-td">
                    <Badge label={t.active ? "Active" : "Inactive"} variant={t.active ? "green" : "gray"} />
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <Can module="laboratory" action="edit">
                        <button className="text-sm text-blue-600 hover:underline"
                          onClick={() => { setEditing(t); setShowModal(true); }}>Edit</button>
                      </Can>
                      <Can module="laboratory" action="delete">
                        <button className="text-red-500 hover:text-red-700 p-1"
                          aria-label={`Delete ${t.name}`} onClick={() => onDelete(t)}>
                          <Trash2 size={15} />
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TestFormModal isOpen={showModal} editing={editing} onClose={closeModal} onSave={onSave} />
    </div>
  );
}
