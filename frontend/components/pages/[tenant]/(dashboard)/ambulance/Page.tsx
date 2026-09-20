"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import FleetTab from "./FleetTab";
import { LIST_AMBULANCES, LIST_AMBULANCE_TRIPS } from "@/graphql/queries/extended";
import {
  CREATE_AMBULANCE, DELETE_AMBULANCE, DISPATCH_AMBULANCE, COMPLETE_AMBULANCE_TRIP, CANCEL_AMBULANCE_TRIP,
} from "@/graphql/mutations/extended";
import { LIST_PATIENT_OPTIONS } from "@/graphql/queries/clinical";
import type { PickerPatient } from "../appointments/types";
import SearchableSelect from "@/components/ui/SearchableSelect";

const TYPES = ["basic", "als", "icu", "mortuary"];
const TRIP_TYPES = ["pickup", "transfer", "discharge", "other"];
const patientLabel = (p: PickerPatient) => `${p.firstName} ${p.lastName ?? ""} (${p.mrn})`.replace(/\s+/g, " ").trim();

export default function AmbulancePage() {
  const refetchQueries = [
    { query: LIST_AMBULANCES, variables: { includeInactive: true } },
    { query: LIST_AMBULANCE_TRIPS, variables: {} },
  ];
  const { data: fleetData, loading, refetch: refetchFleet } = useQuery(LIST_AMBULANCES, { variables: { includeInactive: true } });
  const { data: tripData } = useQuery(LIST_AMBULANCE_TRIPS, { variables: {} });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });

  const [createMut] = useMutation(CREATE_AMBULANCE, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_AMBULANCE, { refetchQueries });
  const [dispatchMut] = useMutation(DISPATCH_AMBULANCE, { refetchQueries });
  const [completeMut] = useMutation(COMPLETE_AMBULANCE_TRIP, { refetchQueries });
  const [cancelMut] = useMutation(CANCEL_AMBULANCE_TRIP, { refetchQueries });

  const fleet = fleetData?.ambulances ?? [];
  const trips = tripData?.ambulanceTrips ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];

  const [tab, setTab] = useState<"trips" | "fleet">("trips");
  const [showAdd, setShowAdd] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", registration: "", vehicle_type: "basic", driver_name: "", driver_phone: "" });
  const [trip, setTrip] = useState({ ambulance_id: "", patient_id: "", trip_type: "pickup", origin: "", destination: "", notes: "" });

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await createMut({ variables: { input: { code: form.code.trim(), registration: form.registration || null, vehicleType: form.vehicle_type, driverName: form.driver_name || null, driverPhone: form.driver_phone || null } } });
      toast.success("Ambulance added"); setShowAdd(false); setForm({ code: "", registration: "", vehicle_type: "basic", driver_name: "", driver_phone: "" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };

  const dispatch = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await dispatchMut({ variables: { input: { ambulanceId: trip.ambulance_id, patientId: trip.patient_id || null, tripType: trip.trip_type, origin: trip.origin || null, destination: trip.destination || null, notes: trip.notes || null } } });
      toast.success("Dispatched"); setShowDispatch(false); setTrip({ ambulance_id: "", patient_id: "", trip_type: "pickup", origin: "", destination: "", notes: "" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  };

  const tabBtn = (t: "trips" | "fleet", label: string) => (
    <button onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-lg ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );
  const available = fleet.filter((a: { status: string; active: boolean }) => a.status === "available" && a.active);

  return (
    <div>
      <Header title="Ambulance" subtitle="Fleet and dispatch trips" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">{tabBtn("trips", "Trips")}{tabBtn("fleet", "Fleet")}</div>
        {tab === "trips" ? (
          <Can module="ambulance" action="create">
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowDispatch(true)}><Plus size={16} /> Dispatch</button>
          </Can>
        ) : (
          <div className="flex gap-2">
            <Can module="ambulance" action="create">
              <BulkUploadButton resource="ambulances" onFinished={() => refetchFleet()} />
            </Can>
            <Can module="ambulance" action="create">
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Ambulance</button>
            </Can>
          </div>
        )}
      </div>

      {loading ? <LoadingSpinner /> : tab === "fleet" ? (
        <FleetTab fleet={fleet} deleteOne={(id) => deleteMut({ variables: { id } })} />
      ) : (
        trips.length === 0 ? <div className="card text-center py-12 text-muted-foreground/70">No trips yet.</div> : (
          <div className="space-y-3">
            {trips.map((t: { id: string; ambulanceCode: string; patientName?: string | null; tripType: string; origin?: string | null; destination?: string | null; dispatchTime: string; status: string }) => (
              <div key={t.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{t.ambulanceCode} <span className="text-xs text-muted-foreground/70 capitalize">· {t.tripType}</span></div>
                  <div className="text-sm text-muted-foreground">{t.patientName || "—"}{t.origin || t.destination ? ` · ${t.origin ?? "?"} → ${t.destination ?? "?"}` : ""}</div>
                  <div className="text-xs text-muted-foreground/70">{new Date(t.dispatchTime).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={t.status} variant={t.status === "completed" ? "green" : t.status === "cancelled" ? "gray" : "yellow"} className="capitalize" />
                  {t.status === "dispatched" && (
                    <Can module="ambulance" action="edit">
                      <button className="btn-secondary text-xs" onClick={() => completeMut({ variables: { id: t.id } })}>Complete</button>
                      <button className="text-xs text-red-500 hover:underline" onClick={() => cancelMut({ variables: { id: t.id } })}>Cancel</button>
                    </Can>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Modal title="Add Ambulance" isOpen={showAdd} onClose={() => setShowAdd(false)}>
        <form onSubmit={add} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Code</label><input className="input-field" value={form.code} required onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><label className="block text-sm font-medium mb-1">Registration</label><input className="input-field" value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Type</label><select className="input-field" value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Driver</label><input className="input-field" value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Driver Phone</label><input className="input-field" value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} /></div>
          <div className="flex gap-3 pt-2"><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Add"}</button><button type="button" className="btn-secondary flex-1" onClick={() => setShowAdd(false)}>Cancel</button></div>
        </form>
      </Modal>

      <Modal title="Dispatch Ambulance" isOpen={showDispatch} onClose={() => setShowDispatch(false)}>
        <form onSubmit={dispatch} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Ambulance</label>
              <SearchableSelect
                value={trip.ambulance_id}
                onChange={(v) => setTrip({ ...trip, ambulance_id: v })}
                options={available.map((a: { id: string; code: string }) => ({ value: a.id, label: a.code }))}
                placeholder="Select…"
                required
              /></div>
            <div><label className="block text-sm font-medium mb-1">Trip Type</label><select className="input-field" value={trip.trip_type} onChange={(e) => setTrip({ ...trip, trip_type: e.target.value })}>{TRIP_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Patient (optional)</label>
            <SearchableSelect
              value={trip.patient_id}
              onChange={(v) => setTrip({ ...trip, patient_id: v })}
              options={patients.map((p) => ({ value: p.id, label: patientLabel(p) }))}
              placeholder="— none —"
            /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Origin</label><input className="input-field" value={trip.origin} onChange={(e) => setTrip({ ...trip, origin: e.target.value })} /></div>
            <div><label className="block text-sm font-medium mb-1">Destination</label><input className="input-field" value={trip.destination} onChange={(e) => setTrip({ ...trip, destination: e.target.value })} /></div>
          </div>
          <div className="flex gap-3 pt-2"><button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? "Dispatching…" : "Dispatch"}</button><button type="button" className="btn-secondary flex-1" onClick={() => setShowDispatch(false)}>Cancel</button></div>
        </form>
      </Modal>
    </div>
  );
}
