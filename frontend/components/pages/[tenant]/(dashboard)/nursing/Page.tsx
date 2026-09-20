"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { BedDouble } from "lucide-react";
import { useNursing } from "./useNursing";
import VitalsPanel from "./VitalsPanel";
import MedicationsPanel from "./MedicationsPanel";

type Tab = "vitals" | "meds";

export default function NursingPage() {
  const { admissions, loading } = useNursing();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("vitals");

  const selected = admissions.find((a) => a.id === selectedId) ?? null;

  return (
    <div>
      <Header title="Nursing Station" subtitle="Vitals charting & medication records for admitted patients" />

      {loading ? (
        <LoadingSpinner />
      ) : admissions.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No patients currently admitted.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
          {/* Admitted patient list */}
          <div className="card p-2 h-fit">
            <div className="text-xs font-medium text-muted-foreground/70 px-2 py-1">Admitted patients</div>
            <div className="space-y-1">
              {admissions.map((a) => (
                <button key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${
                    selectedId === a.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                  }`}>
                  <div className="text-sm font-medium">{a.patientName}</div>
                  <div className="text-xs text-muted-foreground/70 flex items-center gap-1">
                    <BedDouble size={11} /> {a.wardName ?? "—"}{a.bedNumber ? ` · ${a.bedNumber}` : ""}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div>
            {!selected ? (
              <div className="card text-center py-16 text-muted-foreground/70">Select an admitted patient to chart care.</div>
            ) : (
              <div>
                <div className="mb-3">
                  <div className="font-semibold">{selected.patientName} <span className="text-xs text-muted-foreground/70">({selected.patientMrn})</span></div>
                  <div className="text-xs text-muted-foreground/70">{selected.wardName}{selected.bedNumber ? ` · Bed ${selected.bedNumber}` : ""}</div>
                </div>
                <div className="flex gap-2 mb-4">
                  {(["vitals", "meds"] as Tab[]).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}>
                      {t === "vitals" ? "Vitals" : "Medications (MAR)"}
                    </button>
                  ))}
                </div>
                {tab === "vitals"
                  ? <VitalsPanel admissionId={selected.id} />
                  : <MedicationsPanel admissionId={selected.id} />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
