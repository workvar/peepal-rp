"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { useLab } from "./useLab";
import TestsTab from "./TestsTab";
import OrdersTab from "./OrdersTab";
import type { GqlLabTest, GqlLabOrder, LabTestForm } from "./types";

type Tab = "orders" | "tests";

export default function LaboratoryPage() {
  const {
    tests, orders, patients, clinicians, loading,
    refetchTests,
    createTestMut, updateTestMut, deleteTestMut,
    createOrderMut, enterResultsMut, cancelOrderMut,
  } = useLab();

  const [tab, setTab] = useState<Tab>("orders");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const saveTest = async (editing: GqlLabTest | null, form: LabTestForm) => {
    const base = {
      code: form.code.trim(),
      name: form.name.trim(),
      category: form.category || null,
      panel: form.panel || null,
      method: form.method || null,
      sampleType: form.sample_type,
      unit: form.unit || null,
      refLow: parseFloat(form.ref_low) || 0,
      refHigh: parseFloat(form.ref_high) || 0,
      refText: form.ref_text || null,
      price: parseFloat(form.price) || 0,
    };
    try {
      if (editing) {
        await updateTestMut({ variables: { id: editing.id, input: { ...base, active: form.active } } });
        toast.success("Test updated");
      } else {
        await createTestMut({ variables: { input: base } });
        toast.success("Test added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save test");
      throw err;
    }
  };

  const deleteTest = (t: GqlLabTest) => {
    setConfirmState({
      title: "Delete Test",
      message: `“${t.name}” will be removed from the catalog. Existing orders keep their frozen copy.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteTestMut({ variables: { id: t.id } });
        toast.success("Deleted");
      },
    });
  };

  const createOrder = async (input: { patientId: string; orderedById: string; notes: string; testIds: string[] }) => {
    try {
      await createOrderMut({
        variables: {
          input: {
            patientId: input.patientId,
            orderedById: input.orderedById || null,
            notes: input.notes || null,
            tests: input.testIds.map((testId) => ({ testId })),
          },
        },
      });
      toast.success("Order created");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
      throw err;
    }
  };

  const enterResults = async (orderId: string, results: { itemId: string; resultValue: string }[]) => {
    try {
      await enterResultsMut({ variables: { orderId, results } });
      toast.success("Results saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save results");
      throw err;
    }
  };

  const cancelOrder = (o: GqlLabOrder) => {
    setConfirmState({
      title: "Cancel Order",
      message: `Cancel the lab order for ${o.patientName}?`,
      variant: "danger",
      confirmLabel: "Cancel Order",
      onConfirm: async () => {
        await cancelOrderMut({ variables: { id: o.id } });
        toast.success("Order cancelled");
      },
    });
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
      <Header title="Laboratory" subtitle="Test catalog, orders from encounters, and results with reference ranges" />

      <div className="flex gap-2 mb-4">
        {tabBtn("orders", "Orders")}
        {tabBtn("tests", "Test Catalog")}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tab === "orders" ? (
        <OrdersTab orders={orders} tests={tests} patients={patients} clinicians={clinicians}
          onCreate={createOrder} onEnterResults={enterResults} onCancel={cancelOrder}
          onSaveTest={saveTest} onDeleteTest={deleteTest} />
      ) : (
        <TestsTab tests={tests} onSave={saveTest} onDelete={deleteTest} onBulkFinished={() => refetchTests()} />
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
