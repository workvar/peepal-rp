"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { usePharmacy } from "./usePharmacy";
import DrugsTab from "./DrugsTab";
import DispensesTab from "./DispensesTab";
import ExpiringDrugsPanel from "./ExpiringDrugsPanel";
import type { GqlDrug, DrugForm, BatchForm, DispenseForm } from "./types";

type Tab = "drugs" | "dispenses" | "expiring";

export default function PharmacyPage() {
  const {
    drugs, dispenses, patients, loading,
    createDrugMut, updateDrugMut, deleteDrugMut, adjustStockMut, createDrugBatchMut, createDispenseMut,
    refetchDrugs,
  } = usePharmacy();

  const [tab, setTab] = useState<Tab>("drugs");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const saveDrug = async (editing: GqlDrug | null, form: DrugForm) => {
    const base = {
      name: form.name.trim(),
      genericName: form.generic_name || null,
      form: form.form,
      strength: form.strength || null,
      unit: form.unit || null,
      unitPrice: parseFloat(form.unit_price) || 0,
      reorderLevel: parseFloat(form.reorder_level) || 0,
    };
    try {
      if (editing) {
        await updateDrugMut({ variables: { id: editing.id, input: { ...base, active: form.active } } });
        toast.success("Drug updated");
      } else {
        const batchNo = form.batch_no.trim();
        await createDrugMut({
          variables: {
            input: {
              ...base,
              stockQty: parseFloat(form.stock_qty) || 0,
              batchNo: batchNo || null,
              expiryDate: batchNo ? form.expiry_date || null : null,
            },
          },
        });
        toast.success("Drug added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save drug");
      throw err;
    }
  };

  const deleteDrug = (d: GqlDrug) => {
    setConfirmState({
      title: "Delete Drug",
      message: `“${d.name}” will be removed from the catalog. Past dispenses keep their frozen copy.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteDrugMut({ variables: { id: d.id } });
        toast.success("Deleted");
      },
    });
  };

  const saveBatch = async (d: GqlDrug, form: BatchForm) => {
    try {
      await createDrugBatchMut({
        variables: {
          input: {
            drugId: d.id,
            batchNo: form.batch_no.trim(),
            expiryDate: form.expiry_date || null,
            qty: parseFloat(form.qty) || 0,
            unitCost: parseFloat(form.unit_cost) || 0,
          },
        },
      });
      toast.success("Batch logged");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to log batch");
      throw err;
    }
  };

  const deleteManyDrugs = (list: GqlDrug[]) => {
    if (list.length === 0) return;
    setConfirmState({
      title: `Delete ${list.length} drug${list.length > 1 ? "s" : ""}`,
      message: `${list.length} drug${list.length > 1 ? "s" : ""} will be removed from the catalog. Past dispenses keep their frozen copy. This cannot be undone.`,
      variant: "danger",
      confirmLabel: `Delete ${list.length}`,
      onConfirm: async () => {
        let ok = 0;
        for (const d of list) {
          try {
            // Skip the per-call refetch; we refetch once after the loop.
            await deleteDrugMut({ variables: { id: d.id }, refetchQueries: [] });
            ok++;
          } catch {
            // continue; report at the end
          }
        }
        await refetchDrugs();
        const failed = list.length - ok;
        if (failed === 0) toast.success(`Deleted ${ok}`);
        else toast.error(`Deleted ${ok}, ${failed} failed`);
      },
    });
  };

  const adjustStock = async (d: GqlDrug, delta: number) => {
    try {
      await adjustStockMut({ variables: { id: d.id, delta } });
      toast.success("Stock updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update stock");
      throw err;
    }
  };

  const saveDispense = async (form: DispenseForm) => {
    const input = {
      patientId: form.patient_id,
      date: form.date,
      notes: form.notes || null,
      items: form.lines.map((l) => ({ drugId: l.drug_id, qty: parseFloat(l.qty) || 0 })),
    };
    try {
      await createDispenseMut({ variables: { input } });
      toast.success("Dispensed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to dispense");
      throw err;
    }
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <Header
        title="Pharmacy"
        subtitle="Drug catalog, live stock, and dispensing against prescriptions"
      />

      <div className="flex gap-2 mb-4">
        {tabBtn("drugs", "Drugs & Stock")}
        {tabBtn("dispenses", "Dispenses")}
        {tabBtn("expiring", "Expiring")}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tab === "drugs" ? (
        <DrugsTab drugs={drugs} onSave={saveDrug} onDelete={deleteDrug} onAdjustStock={adjustStock}
          onAddBatch={saveBatch} onDeleteMany={deleteManyDrugs} onBulkFinished={() => refetchDrugs()} />
      ) : tab === "dispenses" ? (
        <DispensesTab dispenses={dispenses} drugs={drugs} patients={patients} onSave={saveDispense} />
      ) : (
        <ExpiringDrugsPanel days={90} />
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
