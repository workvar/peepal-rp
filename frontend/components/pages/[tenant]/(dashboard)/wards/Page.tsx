"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { BulkUploadButton } from "@/components/ui/BulkUpload";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, BedDouble } from "lucide-react";
import toast from "react-hot-toast";
import { useWards } from "./useWards";
import WardModal, { type WardForm } from "./WardModal";
import BedModal, { type BedForm } from "./BedModal";
import { bedStatusVariant, type GqlWard, type GqlBed } from "../ipd/types";

export default function WardsPage() {
  const {
    wards, loading, refetch,
    createWardMut, updateWardMut, deleteWardMut,
    createBedMut, updateBedMut, deleteBedMut,
  } = useWards();

  const [wardModal, setWardModal] = useState<{ open: boolean; editing: GqlWard | null }>({ open: false, editing: null });
  const [bedModal, setBedModal] = useState<{ open: boolean; ward: GqlWard | null; editing: GqlBed | null }>({ open: false, ward: null, editing: null });
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const saveWard = async (editing: GqlWard | null, form: WardForm) => {
    const base = { code: form.code.trim(), name: form.name.trim(), wardType: form.ward_type, gender: form.gender, floor: form.floor || null };
    try {
      if (editing) {
        await updateWardMut({ variables: { id: editing.id, input: { ...base, active: form.active } } });
        toast.success("Ward updated");
      } else {
        await createWardMut({ variables: { input: base } });
        toast.success("Ward added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save ward");
      throw err;
    }
  };

  const deleteWard = (w: GqlWard) => {
    setConfirmState({
      title: "Delete Ward",
      message: `“${w.name}” and its ${w.bedCount} bed(s) will be removed.`,
      variant: "danger", confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteWardMut({ variables: { id: w.id } });
          toast.success("Deleted");
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed to delete");
        }
      },
    });
  };

  const saveBed = async (editing: GqlBed | null, form: BedForm) => {
    try {
      if (editing) {
        await updateBedMut({
          variables: { id: editing.id, input: { bedNumber: form.bed_number.trim(), bay: form.bay || null, dailyCharge: parseFloat(form.daily_charge) || 0, status: form.status } },
        });
        toast.success("Bed updated");
      } else if (bedModal.ward) {
        await createBedMut({
          variables: { input: { wardId: bedModal.ward.id, bedNumber: form.bed_number.trim(), bay: form.bay || null, dailyCharge: parseFloat(form.daily_charge) || 0 } },
        });
        toast.success("Bed added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save bed");
      throw err;
    }
  };

  const deleteBed = (b: GqlBed) => {
    setConfirmState({
      title: "Delete Bed",
      message: `Bed “${b.bedNumber}” will be removed.`,
      variant: "danger", confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteBedMut({ variables: { id: b.id } });
          toast.success("Deleted");
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed to delete");
        }
      },
    });
  };

  // Group a ward's beds by bay for the grid.
  const bedsByBay = (w: GqlWard) => {
    const groups: Record<string, GqlBed[]> = {};
    for (const b of w.beds) {
      const key = b.bay || "—";
      (groups[key] ??= []).push(b);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  return (
    <div>
      <Header title="Wards & Beds" subtitle="Set up wards, bays, and beds; live occupancy" />

      <div className="mb-4 flex justify-end items-center gap-2">
        <Can module="wards" action="create">
          <BulkUploadButton resource="wards" label="Bulk Wards" onFinished={(st) => { if (st.successful > 0) refetch(); }} />
          <BulkUploadButton resource="beds" label="Bulk Beds" onFinished={(st) => { if (st.successful > 0) refetch(); }} />
          <button className="btn-primary flex items-center gap-2" onClick={() => setWardModal({ open: true, editing: null })}>
            <Plus size={16} /> Add Ward
          </button>
        </Can>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : wards.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">No wards yet. Add one to start placing beds.</div>
      ) : (
        <div className="space-y-4">
          {wards.map((w) => (
            <div key={w.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{w.name}</span>
                    <span className="text-xs font-mono text-muted-foreground/70">{w.code}</span>
                    <Badge label={w.wardType} variant="blue" className="capitalize" />
                    {w.gender !== "any" && <Badge label={w.gender} variant="purple" className="capitalize" />}
                    {!w.active && <Badge label="Inactive" variant="gray" />}
                  </div>
                  <div className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                    <BedDouble size={13} /> {w.occupiedCount}/{w.bedCount} occupied
                    {w.floor ? ` · Floor ${w.floor}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Can module="wards" action="create">
                    <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => setBedModal({ open: true, ward: w, editing: null })}>
                      <Plus size={14} /> Bed
                    </button>
                  </Can>
                  <Can module="wards" action="edit">
                    <button className="text-blue-600 hover:text-blue-700 p-1" aria-label="Edit ward" onClick={() => setWardModal({ open: true, editing: w })}>
                      <Pencil size={15} />
                    </button>
                  </Can>
                  <Can module="wards" action="delete">
                    <button className="text-red-500 hover:text-red-700 p-1" aria-label="Delete ward" onClick={() => deleteWard(w)}>
                      <Trash2 size={15} />
                    </button>
                  </Can>
                </div>
              </div>

              {w.beds.length === 0 ? (
                <div className="text-sm text-muted-foreground/60 py-4 text-center border border-dashed border-border/60 rounded-lg">
                  No beds yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {bedsByBay(w).map(([bay, beds]) => (
                    <div key={bay}>
                      {bay !== "—" && <div className="text-xs font-medium text-muted-foreground/70 mb-1.5">{bay}</div>}
                      <div className="flex flex-wrap gap-2">
                        {beds.map((b) => (
                          <button key={b.id}
                            className={`group relative w-24 rounded-lg border p-2 text-left transition-colors ${
                              b.status === "occupied" ? "border-red-300/60 bg-red-500/5"
                                : b.status === "maintenance" ? "border-amber-300/60 bg-amber-500/5"
                                : "border-emerald-300/60 bg-emerald-500/5 hover:bg-emerald-500/10"
                            }`}
                            onClick={() => setBedModal({ open: true, ward: w, editing: b })}
                            title={b.status === "occupied" ? `${b.patientName}` : b.status}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">{b.bedNumber}</span>
                              <Badge label={b.status[0].toUpperCase()} variant={bedStatusVariant(b.status)} />
                            </div>
                            <div className="text-[11px] text-muted-foreground/70 truncate">
                              {b.status === "occupied" ? b.patientName : `${b.dailyCharge.toFixed(0)}/day`}
                            </div>
                            {b.status !== "occupied" && (
                              <Can module="wards" action="delete">
                                <span role="button" tabIndex={0}
                                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                                  aria-label={`Delete bed ${b.bedNumber}`}
                                  onClick={(e) => { e.stopPropagation(); deleteBed(b); }}>
                                  <Trash2 size={11} />
                                </span>
                              </Can>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <WardModal isOpen={wardModal.open} editing={wardModal.editing}
        onClose={() => setWardModal({ open: false, editing: null })} onSave={saveWard} />
      <BedModal isOpen={bedModal.open} editing={bedModal.editing} wardName={bedModal.ward?.name ?? ""}
        onClose={() => setBedModal({ open: false, ward: null, editing: null })} onSave={saveBed} />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
