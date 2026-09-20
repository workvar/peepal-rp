"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import { Plus, BedDouble, Utensils } from "lucide-react";
import toast from "react-hot-toast";
import { LIST_ADMISSIONS } from "@/graphql/queries/diagnostics";
import { LIST_DIET_PLANS } from "@/graphql/queries/extended";
import { CREATE_DIET_PLAN, DISCONTINUE_DIET_PLAN, RECORD_MEAL_SERVING } from "@/graphql/mutations/extended";
import type { GqlAdmission } from "../ipd/types";

const DIET_TYPES = ["normal", "diabetic", "renal", "cardiac", "soft", "liquid", "npo"];
const MEALS = ["breakfast", "lunch", "dinner", "snack"];

function PlanPanel({ admissionId }: { admissionId: string }) {
  const { data, loading } = useQuery(LIST_DIET_PLANS, { variables: { admissionId, includeDiscontinued: true } });
  const refetchQueries = [{ query: LIST_DIET_PLANS, variables: { admissionId, includeDiscontinued: true } }];
  const [createMut] = useMutation(CREATE_DIET_PLAN, { refetchQueries });
  const [discontinueMut] = useMutation(DISCONTINUE_DIET_PLAN, { refetchQueries });
  const [serveMut] = useMutation(RECORD_MEAL_SERVING, { refetchQueries });

  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ diet_type: "normal", calories: "", restrictions: "", notes: "" });
  const plans = data?.dietPlans ?? [];

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await createMut({ variables: { input: { admissionId, dietType: form.diet_type, calories: parseInt(form.calories, 10) || 0, restrictions: form.restrictions || null, notes: form.notes || null } } });
      toast.success("Diet plan created"); setShow(false); setForm({ diet_type: "normal", calories: "", restrictions: "", notes: "" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };

  const serve = async (planId: string, mealType: string, status: string) => {
    try { await serveMut({ variables: { input: { dietPlanId: planId, mealType, status } } }); toast.success("Recorded"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Can module="dietary" action="create"><button className="btn-primary flex items-center gap-2" onClick={() => setShow(true)}><Plus size={16} /> New Diet Plan</button></Can>
      </div>
      {loading ? <div className="text-sm text-muted-foreground/70 py-6 text-center">Loading…</div> : plans.length === 0 ? (
        <div className="card text-center py-10 text-muted-foreground/70">No diet plan yet.</div>
      ) : (
        <div className="space-y-3">
          {plans.map((p: { id: string; dietType: string; calories: number; restrictions?: string | null; status: string; servings: { id: string; mealType: string; servedAt: string; status: string }[] }) => (
            <div key={p.id} className={`card ${p.status !== "active" ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium capitalize">{p.dietType} diet {p.calories ? <span className="text-sm text-muted-foreground">· {p.calories} kcal</span> : null}</div>
                  {p.restrictions && <div className="text-xs text-muted-foreground/70">Restrictions: {p.restrictions}</div>}
                </div>
                {p.status === "active"
                  ? <Can module="dietary" action="edit"><button className="text-xs text-red-500 hover:underline" onClick={() => discontinueMut({ variables: { id: p.id } })}>Discontinue</button></Can>
                  : <Badge label="Discontinued" variant="gray" />}
              </div>
              {p.status === "active" && (
                <Can module="dietary" action="create">
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                    {MEALS.map((m) => (
                      <button key={m} className="text-xs rounded-lg border border-border/60 px-2 py-1 hover:bg-muted/50 capitalize flex items-center gap-1" onClick={() => serve(p.id, m, "served")}>
                        <Utensils size={11} /> {m}
                      </button>
                    ))}
                  </div>
                </Can>
              )}
              {p.servings.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.servings.slice(0, 10).map((s) => (
                    <Badge key={s.id} variant={s.status === "served" ? "green" : s.status === "refused" ? "red" : "yellow"}
                      label={`${s.mealType} · ${new Date(s.servedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`} className="capitalize" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal title="New Diet Plan" isOpen={show} onClose={() => setShow(false)}>
        <form onSubmit={create} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Diet Type</label><select className="input-field" value={form.diet_type} onChange={(e) => setForm({ ...form, diet_type: e.target.value })}>{DIET_TYPES.map((d) => <option key={d}>{d}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Calories</label><input type="number" className="input-field" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Restrictions</label><input className="input-field" value={form.restrictions} onChange={(e) => setForm({ ...form, restrictions: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">Notes</label><input className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex gap-3 pt-2"><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Create"}</button><button type="button" className="btn-secondary flex-1" onClick={() => setShow(false)}>Cancel</button></div>
        </form>
      </Modal>
    </div>
  );
}

export default function DietaryPage() {
  const { data, loading } = useQuery(LIST_ADMISSIONS, { variables: {} });
  const admissions: GqlAdmission[] = data?.admissions ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = admissions.find((a) => a.id === selectedId) ?? null;

  return (
    <div>
      <Header title="Dietary / Kitchen" subtitle="Diet plans and meal service for admitted patients" />
      {loading ? <LoadingSpinner /> : admissions.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No patients currently admitted.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
          <div className="card p-2 h-fit">
            <div className="text-xs font-medium text-muted-foreground/70 px-2 py-1">Admitted patients</div>
            <div className="space-y-1">
              {admissions.map((a) => (
                <button key={a.id} onClick={() => setSelectedId(a.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 ${selectedId === a.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
                  <div className="text-sm font-medium">{a.patientName}</div>
                  <div className="text-xs text-muted-foreground/70 flex items-center gap-1"><BedDouble size={11} /> {a.wardName ?? "—"}{a.bedNumber ? ` · ${a.bedNumber}` : ""}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            {!selected ? <div className="card text-center py-16 text-muted-foreground/70">Select an admitted patient.</div>
              : (
                <div>
                  <div className="mb-3 font-semibold">{selected.patientName} <span className="text-xs text-muted-foreground/70">({selected.patientMrn})</span></div>
                  <PlanPanel admissionId={selected.id} />
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
