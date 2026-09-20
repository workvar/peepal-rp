"use client";

// Medication administration record (MAR) for one admission: active orders, an
// add-order modal, per-order administration events, and discontinue.

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import Modal from "@/components/ui/Modal";
import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, Ban } from "lucide-react";
import toast from "react-hot-toast";
import { LIST_MEDICATION_ORDERS } from "@/graphql/queries/operations";
import {
  CREATE_MEDICATION_ORDER, DISCONTINUE_MEDICATION_ORDER, RECORD_ADMINISTRATION,
} from "@/graphql/mutations/operations";

const ROUTES = ["oral", "iv", "im", "sc", "topical", "inhaled", "other"];
const emptyForm = { drug_name: "", dose: "", route: "oral", frequency: "", notes: "" };

type Admin = { id: string; administeredByName?: string | null; administeredAt: string; status: string };
type Order = {
  id: string; drugName: string; dose?: string | null; route?: string | null;
  frequency?: string | null; status: string; administrations: Admin[];
};

export default function MedicationsPanel({ admissionId }: { admissionId: string }) {
  const { data, loading } = useQuery(LIST_MEDICATION_ORDERS, { variables: { admissionId, includeDiscontinued: true } });
  const refetchQueries = [{ query: LIST_MEDICATION_ORDERS, variables: { admissionId, includeDiscontinued: true } }];
  const [createMut] = useMutation(CREATE_MEDICATION_ORDER, { refetchQueries });
  const [discontinueMut] = useMutation(DISCONTINUE_MEDICATION_ORDER, { refetchQueries });
  const [administerMut] = useMutation(RECORD_ADMINISTRATION, { refetchQueries });

  const [show, setShow] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof emptyForm>) => setForm((f) => ({ ...f, ...patch }));

  const orders: Order[] = data?.medicationOrders ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createMut({ variables: { input: {
        admissionId, drugName: form.drug_name, dose: form.dose || null,
        route: form.route, frequency: form.frequency || null, notes: form.notes || null,
      } } });
      toast.success("Medication ordered");
      setShow(false); setForm(emptyForm);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to order");
    } finally { setSaving(false); }
  };

  const administer = async (o: Order, status: string) => {
    try { await administerMut({ variables: { input: { medicationOrderId: o.id, status } } }); toast.success("Recorded"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const discontinue = async (o: Order) => {
    try { await discontinueMut({ variables: { id: o.id } }); toast.success("Discontinued"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Can module="nursing" action="create">
          <button className="btn-primary flex items-center gap-2" onClick={() => setShow(true)}>
            <Plus size={16} /> Order Medication
          </button>
        </Can>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground/70 py-6 text-center">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-10 text-muted-foreground/70">No medications ordered yet.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className={`card ${o.status !== "active" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {o.drugName} {o.dose && <span className="text-sm text-muted-foreground">· {o.dose}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground/70">
                    {[o.route, o.frequency].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {o.status === "active" ? (
                    <Can module="nursing" action="create">
                      <button className="text-emerald-600 hover:text-emerald-700 p-1" title="Given" onClick={() => administer(o, "given")}><Check size={16} /></button>
                      <button className="text-amber-600 hover:text-amber-700 p-1" title="Held" onClick={() => administer(o, "held")}><Ban size={16} /></button>
                      <button className="text-xs text-red-500 hover:underline" onClick={() => discontinue(o)}>Discontinue</button>
                    </Can>
                  ) : (
                    <Badge label="Discontinued" variant="gray" />
                  )}
                </div>
              </div>
              {o.administrations.length > 0 && (
                <div className="mt-2 border-t border-border/50 pt-2 flex flex-wrap gap-1.5">
                  {o.administrations.slice(0, 8).map((a) => (
                    <Badge key={a.id} variant={a.status === "given" ? "green" : a.status === "refused" ? "red" : "yellow"}
                      label={`${a.status} · ${new Date(a.administeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                      className="capitalize" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal title="Order Medication" isOpen={show} onClose={() => setShow(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Drug</label>
            <input className="input-field" value={form.drug_name} required onChange={(e) => set({ drug_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Dose</label>
              <input className="input-field" placeholder="500 mg" value={form.dose} onChange={(e) => set({ dose: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Route</label>
              <select className="input-field" value={form.route} onChange={(e) => set({ route: e.target.value })}>
                {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Frequency</label>
              <input className="input-field" placeholder="BD / q8h" value={form.frequency} onChange={(e) => set({ frequency: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
            <input className="input-field" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Order"}</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShow(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
