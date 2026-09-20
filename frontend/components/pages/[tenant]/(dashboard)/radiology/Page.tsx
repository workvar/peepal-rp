"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { useRadiology } from "./useRadiology";
import StudiesTab from "./StudiesTab";
import OrdersTab from "./OrdersTab";
import type { GqlRadStudy, GqlRadOrder, RadStudyForm } from "./types";

type Tab = "orders" | "studies";

export default function RadiologyPage() {
  const {
    studies, orders, patients, clinicians, loading,
    createStudyMut, updateStudyMut, deleteStudyMut,
    createOrderMut, setStatusMut, reportMut,
  } = useRadiology();

  const [tab, setTab] = useState<Tab>("orders");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const saveStudy = async (editing: GqlRadStudy | null, form: RadStudyForm) => {
    const base = {
      code: form.code.trim(),
      name: form.name.trim(),
      modality: form.modality,
      bodyPart: form.body_part || null,
      price: parseFloat(form.price) || 0,
    };
    try {
      if (editing) {
        await updateStudyMut({ variables: { id: editing.id, input: { ...base, active: form.active } } });
        toast.success("Study updated");
      } else {
        await createStudyMut({ variables: { input: base } });
        toast.success("Study added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save study");
      throw err;
    }
  };

  const deleteStudy = (s: GqlRadStudy) => {
    setConfirmState({
      title: "Delete Study",
      message: `“${s.name}” will be removed from the catalog. Existing orders keep their frozen copy.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteStudyMut({ variables: { id: s.id } });
        toast.success("Deleted");
      },
    });
  };

  const createOrder = async (input: { patientId: string; orderedById: string; studyId: string; notes: string }) => {
    try {
      await createOrderMut({
        variables: {
          input: {
            patientId: input.patientId,
            orderedById: input.orderedById || null,
            studyId: input.studyId,
            notes: input.notes || null,
          },
        },
      });
      toast.success("Order created");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
      throw err;
    }
  };

  const setStatus = async (o: GqlRadOrder, status: string) => {
    try {
      await setStatusMut({ variables: { id: o.id, status } });
      toast.success("Status updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const report = async (o: GqlRadOrder, findings: string, impression: string) => {
    try {
      await reportMut({ variables: { id: o.id, input: { findings, impression } } });
      toast.success("Report filed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to file report");
      throw err;
    }
  };

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}>
      {label}
    </button>
  );

  return (
    <div>
      <Header title="Radiology" subtitle="Imaging catalog, orders, and radiologist reports" />

      <div className="flex gap-2 mb-4">
        {tabBtn("orders", "Orders")}
        {tabBtn("studies", "Study Catalog")}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tab === "orders" ? (
        <OrdersTab orders={orders} studies={studies} patients={patients} clinicians={clinicians}
          onCreate={createOrder} onSetStatus={setStatus} onReport={report} />
      ) : (
        <StudiesTab studies={studies} onSave={saveStudy} onDelete={deleteStudy} />
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
